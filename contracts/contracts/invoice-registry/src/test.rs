#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

#[test]
fn test_invoice_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let customer = Address::generate(&env);
    let token = Address::generate(&env);

    let contract_id = env.register(InvoiceRegistry, ());
    let client = InvoiceRegistryClient::new(&env, &contract_id);

    client.initialize(&admin);

    let invoice_id = BytesN::from_array(&env, &[1; 32]);
    let metadata_hash = BytesN::from_array(&env, &[2; 32]);
    let due_at = 2000000000;

    // Create Invoice
    client.create_invoice(
        &invoice_id,
        &merchant,
        &Some(customer.clone()),
        &token,
        &1000,
        &metadata_hash,
        &due_at,
    );

    // Verify properties
    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.amount, 1000);
    assert_eq!(invoice.status, InvoiceStatus::Open);

    // Mark Paid
    let pay_ref = BytesN::from_array(&env, &[3; 32]);
    client.mark_paid(&invoice_id, &pay_ref);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Paid);
    assert_eq!(invoice.payment_reference, Some(pay_ref));

    // Mark Refunded
    let refund_ref = BytesN::from_array(&env, &[4; 32]);
    client.mark_refunded(&invoice_id, &refund_ref);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Refunded);
}

#[test]
fn test_cancel_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let token = Address::generate(&env);

    let contract_id = env.register(InvoiceRegistry, ());
    let client = InvoiceRegistryClient::new(&env, &contract_id);

    client.initialize(&admin);

    let invoice_id = BytesN::from_array(&env, &[1; 32]);
    let metadata_hash = BytesN::from_array(&env, &[2; 32]);

    client.create_invoice(
        &invoice_id,
        &merchant,
        &None,
        &token,
        &500,
        &metadata_hash,
        &0,
    );

    client.cancel_invoice(&invoice_id);
    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Cancelled);
}
