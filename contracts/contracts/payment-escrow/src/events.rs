use soroban_sdk::{symbol_short, Address, BytesN, Env};

pub fn escrow_created(
    env: &Env,
    escrow_id: BytesN<32>,
    invoice_id: BytesN<32>,
    payer: Address,
    merchant: Address,
    amount: i128,
    token: Address,
) {
    let topics = (symbol_short!("created"), escrow_id);
    env.events()
        .publish(topics, (invoice_id, payer, merchant, amount, token));
}

pub fn escrow_deposited(env: &Env, escrow_id: BytesN<32>, payer: Address, amount: i128) {
    let topics = (symbol_short!("deposit"), escrow_id);
    env.events().publish(topics, (payer, amount));
}

pub fn escrow_released(
    env: &Env,
    escrow_id: BytesN<32>,
    merchant: Address,
    merchant_amount: i128,
    platform_fee: i128,
) {
    let topics = (symbol_short!("release"), escrow_id);
    env.events()
        .publish(topics, (merchant, merchant_amount, platform_fee));
}

pub fn escrow_refunded(env: &Env, escrow_id: BytesN<32>, payer: Address, amount: i128) {
    let topics = (symbol_short!("refund"), escrow_id);
    env.events().publish(topics, (payer, amount));
}

pub fn escrow_disputed(
    env: &Env,
    escrow_id: BytesN<32>,
    payer: Address,
    evidence_hash: BytesN<32>,
) {
    let topics = (symbol_short!("dispute"), escrow_id);
    env.events().publish(topics, (payer, evidence_hash));
}

pub fn dispute_resolved(
    env: &Env,
    escrow_id: BytesN<32>,
    merchant_amount: i128,
    payer_amount: i128,
) {
    let topics = (symbol_short!("resolve"), escrow_id);
    env.events()
        .publish(topics, (merchant_amount, payer_amount));
}
