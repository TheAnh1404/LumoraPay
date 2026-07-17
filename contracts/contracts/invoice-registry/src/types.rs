use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InvoiceStatus {
    Open,
    Paid,
    Cancelled,
    Expired,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InvoiceRecord {
    pub id: BytesN<32>,
    pub merchant: Address,
    pub customer: Option<Address>,
    pub token: Address,
    pub amount: i128,
    pub metadata_hash: BytesN<32>,
    pub status: InvoiceStatus,
    pub payment_reference: Option<BytesN<32>>,
    pub created_at: u64,
    pub due_at: u64,
}
