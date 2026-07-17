use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Created,
    Funded,
    Active,
    Released,
    Refunded,
    Disputed,
    Resolved,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub id: BytesN<32>,
    pub invoice_id: BytesN<32>,
    pub payer: Address,
    pub merchant: Address,
    pub token: Address,
    pub amount: i128,
    pub remaining_amount: i128,
    pub platform_fee_bps: u32,
    pub status: EscrowStatus,
    pub release_deadline: u64,
    pub created_at: u64,
}
