use soroban_sdk::{contracttype, BytesN};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    FeeRecipient,
    PlatformFeeBps,
    Escrow(BytesN<32>),
}
