#![no_std]
#![allow(clippy::too_many_arguments)]
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};

mod errors;
mod events;
mod storage;
#[cfg(test)]
mod test;
mod types;

use errors::ContractError;
use storage::DataKey;
use types::{InvoiceRecord, InvoiceStatus};

#[contract]
pub struct InvoiceRegistry;

#[contractimpl]
impl InvoiceRegistry {
    pub fn initialize(env: Env, admin: Address) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ContractError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    pub fn create_invoice(
        env: Env,
        invoice_id: BytesN<32>,
        merchant: Address,
        customer: Option<Address>,
        token: Address,
        amount: i128,
        metadata_hash: BytesN<32>,
        due_at: u64,
    ) -> Result<(), ContractError> {
        merchant.require_auth();

        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let key = DataKey::Invoice(invoice_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(ContractError::InvoiceAlreadyExists);
        }

        let created_at = env.ledger().timestamp();
        let record = InvoiceRecord {
            id: invoice_id.clone(),
            merchant: merchant.clone(),
            customer,
            token: token.clone(),
            amount,
            metadata_hash,
            status: InvoiceStatus::Open,
            payment_reference: None,
            created_at,
            due_at,
        };

        env.storage().persistent().set(&key, &record);
        events::invoice_created(&env, invoice_id, merchant, amount, token);
        Ok(())
    }

    pub fn cancel_invoice(env: Env, invoice_id: BytesN<32>) -> Result<(), ContractError> {
        let key = DataKey::Invoice(invoice_id.clone());
        let mut invoice: InvoiceRecord = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::InvoiceNotFound)?;

        invoice.merchant.require_auth();

        match invoice.status {
            InvoiceStatus::Open => {
                invoice.status = InvoiceStatus::Cancelled;
                env.storage().persistent().set(&key, &invoice);
                events::invoice_cancelled(&env, invoice_id, invoice.merchant);
                Ok(())
            }
            InvoiceStatus::Cancelled => Err(ContractError::AlreadyCancelled),
            InvoiceStatus::Paid => Err(ContractError::AlreadyPaid),
            _ => Err(ContractError::InvalidStatus),
        }
    }

    pub fn mark_paid(
        env: Env,
        invoice_id: BytesN<32>,
        payment_reference: BytesN<32>,
    ) -> Result<(), ContractError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;
        admin.require_auth();

        let key = DataKey::Invoice(invoice_id.clone());
        let mut invoice: InvoiceRecord = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::InvoiceNotFound)?;

        if invoice.status != InvoiceStatus::Open {
            return Err(ContractError::InvalidStatus);
        }

        invoice.status = InvoiceStatus::Paid;
        invoice.payment_reference = Some(payment_reference.clone());
        env.storage().persistent().set(&key, &invoice);

        events::invoice_paid(&env, invoice_id, payment_reference);
        Ok(())
    }

    pub fn mark_refunded(
        env: Env,
        invoice_id: BytesN<32>,
        refund_reference: BytesN<32>,
    ) -> Result<(), ContractError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;
        admin.require_auth();

        let key = DataKey::Invoice(invoice_id.clone());
        let mut invoice: InvoiceRecord = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::InvoiceNotFound)?;

        if invoice.status != InvoiceStatus::Paid {
            return Err(ContractError::InvalidStatus);
        }

        invoice.status = InvoiceStatus::Refunded;
        env.storage().persistent().set(&key, &invoice);

        events::invoice_refunded(&env, invoice_id, refund_reference);
        Ok(())
    }

    pub fn get_invoice(env: Env, invoice_id: BytesN<32>) -> Result<InvoiceRecord, ContractError> {
        let key = DataKey::Invoice(invoice_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::InvoiceNotFound)
    }

    pub fn get_admin(env: Env) -> Result<Address, ContractError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)
    }
}
