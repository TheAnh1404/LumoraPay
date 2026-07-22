#![no_std]
#![allow(clippy::too_many_arguments)]
use soroban_sdk::{contract, contractimpl, token, Address, BytesN, Env};

mod errors;
mod events;
mod storage;
#[cfg(test)]
mod test;
mod types;

use errors::ContractError;
use storage::DataKey;
use types::{Escrow, EscrowStatus};

#[contract]
pub struct PaymentEscrow;

#[contractimpl]
impl PaymentEscrow {
    pub fn initialize(
        env: Env,
        admin: Address,
        fee_recipient: Address,
        platform_fee_bps: u32,
    ) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ContractError::AlreadyInitialized);
        }
        if platform_fee_bps > 10000 {
            return Err(ContractError::InvalidFeeBps);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::FeeRecipient, &fee_recipient);
        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeBps, &platform_fee_bps);
        Ok(())
    }

    pub fn create_escrow(
        env: Env,
        escrow_id: BytesN<32>,
        invoice_id: BytesN<32>,
        payer: Address,
        merchant: Address,
        token: Address,
        amount: i128,
        release_deadline: u64,
    ) -> Result<(), ContractError> {
        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        payer.require_auth();

        let key = DataKey::Escrow(escrow_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(ContractError::EscrowAlreadyExists);
        }

        let platform_fee_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::PlatformFeeBps)
            .ok_or(ContractError::NotInitialized)?;

        let created_at = env.ledger().timestamp();
        let escrow = Escrow {
            id: escrow_id.clone(),
            invoice_id: invoice_id.clone(),
            payer: payer.clone(),
            merchant: merchant.clone(),
            token: token.clone(),
            amount,
            remaining_amount: amount,
            platform_fee_bps,
            status: EscrowStatus::Created,
            release_deadline,
            created_at,
        };

        env.storage().persistent().set(&key, &escrow);
        events::escrow_created(&env, escrow_id, invoice_id, payer, merchant, amount, token);
        Ok(())
    }

    pub fn deposit(env: Env, escrow_id: BytesN<32>) -> Result<(), ContractError> {
        let key = DataKey::Escrow(escrow_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Created {
            return Err(ContractError::InvalidStatus);
        }

        escrow.payer.require_auth();

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &escrow.payer,
            &env.current_contract_address(),
            &escrow.amount,
        );

        escrow.status = EscrowStatus::Funded;
        env.storage().persistent().set(&key, &escrow);
        events::escrow_deposited(&env, escrow_id, escrow.payer, escrow.amount);
        Ok(())
    }

    pub fn release(env: Env, escrow_id: BytesN<32>) -> Result<(), ContractError> {
        let key = DataKey::Escrow(escrow_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Funded && escrow.status != EscrowStatus::Active {
            return Err(ContractError::InvalidStatus);
        }

        escrow.payer.require_auth();

        let fee_recipient: Address = env
            .storage()
            .instance()
            .get(&DataKey::FeeRecipient)
            .ok_or(ContractError::NotInitialized)?;

        let platform_fee = (escrow.remaining_amount * escrow.platform_fee_bps as i128) / 10000;
        let merchant_amount = escrow.remaining_amount - platform_fee;

        let token_client = token::Client::new(&env, &escrow.token);

        if platform_fee > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &fee_recipient,
                &platform_fee,
            );
        }
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.merchant,
            &merchant_amount,
        );

        escrow.remaining_amount = 0;
        escrow.status = EscrowStatus::Released;
        env.storage().persistent().set(&key, &escrow);
        events::escrow_released(
            &env,
            escrow_id,
            escrow.merchant,
            merchant_amount,
            platform_fee,
        );
        Ok(())
    }

    pub fn refund(env: Env, escrow_id: BytesN<32>) -> Result<(), ContractError> {
        let key = DataKey::Escrow(escrow_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Funded && escrow.status != EscrowStatus::Active {
            return Err(ContractError::InvalidStatus);
        }

        if env.ledger().timestamp() > escrow.release_deadline {
            // After deadline, payer can request refund (e.g. if merchant failed to deliver)
            escrow.payer.require_auth();
        } else {
            // Before deadline, only merchant can authorize a voluntary refund
            escrow.merchant.require_auth();
        }

        let token_client = token::Client::new(&env, &escrow.token);
        let refunded_amount = escrow.remaining_amount;
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.payer,
            &refunded_amount,
        );

        escrow.remaining_amount = 0;
        escrow.status = EscrowStatus::Refunded;
        env.storage().persistent().set(&key, &escrow);
        events::escrow_refunded(&env, escrow_id, escrow.payer, refunded_amount);
        Ok(())
    }

    pub fn open_dispute(
        env: Env,
        escrow_id: BytesN<32>,
        evidence_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        let key = DataKey::Escrow(escrow_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Funded && escrow.status != EscrowStatus::Active {
            return Err(ContractError::InvalidStatus);
        }

        // Payer opens dispute to freeze funds
        escrow.payer.require_auth();

        escrow.status = EscrowStatus::Disputed;
        env.storage().persistent().set(&key, &escrow);
        events::escrow_disputed(&env, escrow_id, escrow.payer, evidence_hash);
        Ok(())
    }

    pub fn resolve_dispute(
        env: Env,
        escrow_id: BytesN<32>,
        merchant_amount: i128,
        payer_amount: i128,
    ) -> Result<(), ContractError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;
        admin.require_auth();

        let key = DataKey::Escrow(escrow_id.clone());
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Disputed {
            return Err(ContractError::InvalidStatus);
        }

        if merchant_amount + payer_amount != escrow.remaining_amount {
            return Err(ContractError::BalanceMismatch);
        }

        let token_client = token::Client::new(&env, &escrow.token);
        if merchant_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.merchant,
                &merchant_amount,
            );
        }
        if payer_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.payer,
                &payer_amount,
            );
        }

        escrow.remaining_amount = 0;
        escrow.status = EscrowStatus::Resolved;
        env.storage().persistent().set(&key, &escrow);
        events::dispute_resolved(&env, escrow_id, merchant_amount, payer_amount);
        Ok(())
    }

    pub fn get_escrow(env: Env, escrow_id: BytesN<32>) -> Result<Escrow, ContractError> {
        let key = DataKey::Escrow(escrow_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::EscrowNotFound)
    }

    pub fn get_balance(env: Env, escrow_id: BytesN<32>) -> Result<i128, ContractError> {
        let key = DataKey::Escrow(escrow_id);
        let escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::EscrowNotFound)?;
        Ok(escrow.remaining_amount)
    }
}
