use soroban_sdk::{symbol_short, Address, BytesN, Env};

pub fn invoice_created(
    env: &Env,
    invoice_id: BytesN<32>,
    merchant: Address,
    amount: i128,
    token: Address,
) {
    let topics = (symbol_short!("created"), invoice_id);
    env.events().publish(topics, (merchant, amount, token));
}

pub fn invoice_cancelled(env: &Env, invoice_id: BytesN<32>, merchant: Address) {
    let topics = (symbol_short!("cancel"), invoice_id);
    env.events().publish(topics, merchant);
}

pub fn invoice_paid(env: &Env, invoice_id: BytesN<32>, payment_reference: BytesN<32>) {
    let topics = (symbol_short!("paid"), invoice_id);
    env.events().publish(topics, payment_reference);
}

pub fn invoice_refunded(env: &Env, invoice_id: BytesN<32>, refund_reference: BytesN<32>) {
    let topics = (symbol_short!("refund"), invoice_id);
    env.events().publish(topics, refund_reference);
}
