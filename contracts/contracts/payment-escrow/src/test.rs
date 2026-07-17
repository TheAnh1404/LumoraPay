#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, BytesN, Env};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> token::Client<'a> {
    let asset_contract = env.register_stellar_asset_contract_v2(admin.clone());
    token::Client::new(env, &asset_contract.address())
}

#[test]
fn test_escrow_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let fee_recipient = Address::generate(&env);
    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_client = create_token_contract(&env, &token_admin);

    // Mint tokens to payer
    token::StellarAssetClient::new(&env, &token_client.address).mint(&payer, &2000);

    let contract_id = env.register(PaymentEscrow, ());
    let client = PaymentEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &fee_recipient, &500); // 5% fee (500 bps)

    let escrow_id = BytesN::from_array(&env, &[1; 32]);
    let invoice_id = BytesN::from_array(&env, &[2; 32]);
    let release_deadline = env.ledger().timestamp() + 10000;

    client.create_escrow(
        &escrow_id,
        &invoice_id,
        &payer,
        &merchant,
        &token_client.address,
        &1000,
        &release_deadline,
    );

    // Payer deposits
    client.deposit(&escrow_id);

    assert_eq!(token_client.balance(&contract_id), 1000);
    assert_eq!(token_client.balance(&payer), 1000);

    // Release escrow
    client.release(&escrow_id);

    // 5% of 1000 = 50 fee, 950 goes to merchant
    assert_eq!(token_client.balance(&fee_recipient), 50);
    assert_eq!(token_client.balance(&merchant), 950);
    assert_eq!(token_client.balance(&contract_id), 0);

    let escrow = client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Released);
}

#[test]
fn test_refund_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let fee_recipient = Address::generate(&env);
    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_client = create_token_contract(&env, &token_admin);

    token::StellarAssetClient::new(&env, &token_client.address).mint(&payer, &1000);

    let contract_id = env.register(PaymentEscrow, ());
    let client = PaymentEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &fee_recipient, &500);

    let escrow_id = BytesN::from_array(&env, &[1; 32]);
    let invoice_id = BytesN::from_array(&env, &[2; 32]);

    client.create_escrow(
        &escrow_id,
        &invoice_id,
        &payer,
        &merchant,
        &token_client.address,
        &1000,
        &0,
    );

    client.deposit(&escrow_id);
    client.refund(&escrow_id);

    assert_eq!(token_client.balance(&payer), 1000);
    assert_eq!(token_client.balance(&contract_id), 0);
}
