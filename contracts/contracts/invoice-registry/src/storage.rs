use soroban_sdk::{contracttype, BytesN};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Invoice(BytesN<32>),
}
