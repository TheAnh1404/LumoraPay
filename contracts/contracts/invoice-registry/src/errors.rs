use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvoiceNotFound = 4,
    InvoiceAlreadyExists = 5,
    InvalidAmount = 6,
    InvalidStatus = 7,
    AlreadyPaid = 8,
    AlreadyCancelled = 9,
}
