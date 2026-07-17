use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    EscrowNotFound = 4,
    EscrowAlreadyExists = 5,
    InvalidAmount = 6,
    InvalidStatus = 7,
    InvalidFeeBps = 8,
    EscrowExpired = 9,
    EscrowNotExpired = 10,
    BalanceMismatch = 11,
}
