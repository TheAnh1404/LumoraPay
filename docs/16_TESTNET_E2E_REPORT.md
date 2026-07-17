# Lumora Pay Testnet E2E Report

Run date: 2026-07-16

## 1. Environment

- Workspace: `D:\TheAnhProject\LumoraPay`
- Backend API used for final E2E: `http://127.0.0.1:3000/api/v1`
- Network: Stellar Testnet
- Network passphrase: `Test SDF Network ; September 2015`
- Horizon: `https://horizon-testnet.stellar.org`
- Soroban RPC: `https://soroban-testnet.stellar.org`
- Stellar Expert: `https://stellar.expert/explorer/testnet`
- PostgreSQL: local database from `backend/.env`; secret URL not printed.
- Final E2E signing method: real Stellar SDK keypairs generated during the run. No secret key was written to source. This is not a Freighter UI signature.

## 2. Database status

- `npx prisma migrate status`: schema up to date, 2 migrations found.
- `npx prisma validate`: schema valid.
- API health: `/health/database` returned `{"status":"UP","database":"PostgreSQL connected"}`.
- Final DB counts: users 5, wallets 5, merchants 5, customers 6, invoices 12, payments 6, refunds 3, escrows 0, blockchainTransactions 9, contractDeployments 0, contractEvents 0.

## 3. Frontend status

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS. The project maps test to TypeScript validation.
- `npm run build`: PASS outside the sandbox after Vite hit sandbox `spawn EPERM`. Build warning only: large JS chunk.
- Freighter UI was not executed in this CLI environment.

## 4. Backend status

- `npm run lint`: PASS with 32 existing warnings, no errors.
- `npm run typecheck`: PASS.
- `npm run test`: PASS.
- `npm run test:e2e`: PASS.
- `npm run build`: PASS.
- Final E2E used rebuilt `dist/main.js` and stopped the backend process after the run.

## 5. Freighter status

BLOCKED for full browser E2E. No interactive Freighter extension session was available in this workspace, so these were not verified with the real extension: connect Freighter, wallet locked, user rejects signing, wrong network, refresh browser while pending. Frontend code uses `@stellar/freighter-api`, validates Testnet passphrase, and surfaces Freighter errors, but that is not a substitute for a real Freighter run.

## 6. Direct payment test

Status: CONFIRMED_ON_TESTNET via real Horizon transaction, but not Freighter-signed.

- Merchant wallet: `GAKCRIFFS5FQ7XTUBZZHQOXYK5I5I4ZMDC2RXXS5FU4CF5QPXK2BSMBE`
- Payer wallet: `GAXJNPGDMIBEB662MUDZSUWKYUSZ4GW472N5EZQDGJTUIIGILJEITGOZ`
- Friendbot merchant funding tx: `732d50762c944914fd820496ab5155dc4700386735bd47f301057d659030b8f7`
- Friendbot payer funding tx: `386e90de4823b118f7fb268bb844eb2d1518208767ec182b09a62b629a64eba0`
- Merchant id: `680cd47b-e7c5-404f-94e0-31a6d23cc9fe`
- Customer id: `b2104030-cca7-4f51-8ffd-a1bb990cfc58`
- Invoice id: `2515ac4f-6b1e-455d-9dcd-8e8dcb0f4fd6`
- Invoice number: `LM-2026-000009`
- Public checkout token: `eb229465ab715cea8eebe241863ceaf0`
- Payment intent id: `e2de6077-b453-4a3c-96d9-73e4d910827e`
- Amount: `1.00 XLM`
- Memo: `E2E15189371`
- Payment txHash: `920a477283e33453cfe9dd693a95a6d80e66613f4757458bd346be8fa514841f`
- Ledger: `3639666`
- Fee: `0.0000100 XLM`
- Horizon/API result: payment status `CONFIRMED`, blockchain transaction status `SUCCESS`.
- Stellar Expert: `https://stellar.expert/explorer/testnet/tx/920a477283e33453cfe9dd693a95a6d80e66613f4757458bd346be8fa514841f`

## 7. Refund test

Status: CONFIRMED_ON_TESTNET via real Horizon transaction, but not Freighter-signed.

- Refund id: `cf7a13b7-34e1-4b2e-8f11-3ea9c15922cb`
- Amount: `1.00 XLM`
- Memo: `RF26000009`
- Refund txHash: `a5162cb619b72bf5d4a3f43045d75c7a210430ee07df519b82c53597eeaf9688`
- Ledger: `3639667`
- Refund DB status: `CONFIRMED`
- Refund blockchain transaction status: `SUCCESS`
- Stellar Expert: `https://stellar.expert/explorer/testnet/tx/a5162cb619b72bf5d4a3f43045d75c7a210430ee07df519b82c53597eeaf9688`

## 8. Escrow create test

BLOCKED. `/contracts/config` returned empty `invoiceRegistryContractId` and `paymentEscrowContractId`. `/contracts/payment-escrow/health` returns 503: `Payment Escrow contract ID is not configured. Deploy the contract and set the matching environment variable.`

## 9. Escrow deposit test

BLOCKED. Backend escrow endpoints intentionally return 503 until deployed contract IDs and generated bindings exist. No deposit invocation was submitted.

## 10. Escrow release test

BLOCKED. No real `PAYMENT_ESCROW_CONTRACT_ID`, generated binding, or backend Soroban submit flow exists.

## 11. Escrow refund test

BLOCKED. No real escrow was created or funded, so no refund invocation could be submitted.

## 12. Dispute test

BLOCKED. No real escrow lifecycle exists in the backend yet; dispute endpoints are placeholders returning 503.

## 13. Contract events

- `contract_events` table count: 0.
- No Soroban transaction was invoked.
- `payment-escrow` contract has functions for create/deposit/release/refund/dispute, but there is no deployed Testnet contract ID, generated backend binding, or event indexer wired to the database.

## 14. Database synchronization

Final DB records:

- Invoice `2515ac4f-6b1e-455d-9dcd-8e8dcb0f4fd6`: status `REFUNDED`, totalAmount `1`, amountPaid `1`, paidAt `2026-07-16T15:20:18.000Z`.
- Payment `e2de6077-b453-4a3c-96d9-73e4d910827e`: status `CONFIRMED`, txHash `920a477283e33453cfe9dd693a95a6d80e66613f4757458bd346be8fa514841f`, ledger `3639666`.
- Refund `cf7a13b7-34e1-4b2e-8f11-3ea9c15922cb`: status `CONFIRMED`, txHash `a5162cb619b72bf5d4a3f43045d75c7a210430ee07df519b82c53597eeaf9688`, ledger `3639667`.
- Blockchain tx `d39362fd-02af-4209-bb73-8baa17886d65`: kind `CLASSIC_PAYMENT`, status `SUCCESS`, ledger `3639666`.
- Blockchain tx `7843c2e1-13c4-4c4d-9eea-5ed8ee09bec0`: kind `REFUND`, status `SUCCESS`, ledger `3639667`.

## 15. Real txHashes

- Direct payment: `920a477283e33453cfe9dd693a95a6d80e66613f4757458bd346be8fa514841f`
- Refund: `a5162cb619b72bf5d4a3f43045d75c7a210430ee07df519b82c53597eeaf9688`
- Merchant Friendbot funding: `732d50762c944914fd820496ab5155dc4700386735bd47f301057d659030b8f7`
- Payer Friendbot funding: `386e90de4823b118f7fb268bb844eb2d1518208767ec182b09a62b629a64eba0`

## 16. Contract IDs

- Invoice Registry contract ID: not configured.
- Payment Escrow contract ID: not configured.
- Contract deployment DB rows: 0.
- WASM build hashes:
  - Invoice Registry: `dfcacbbc55155786b3d157ce78e94fe7ba24731eb5a4cb8d649d32cce2ca0115`
  - Payment Escrow: `1b76ece2f18280e8ba478347c03c542660e7069315772d46a44d65e9005a2c66`

## 17. Stellar Expert links

- Direct payment: `https://stellar.expert/explorer/testnet/tx/920a477283e33453cfe9dd693a95a6d80e66613f4757458bd346be8fa514841f`
- Refund: `https://stellar.expert/explorer/testnet/tx/a5162cb619b72bf5d4a3f43045d75c7a210430ee07df519b82c53597eeaf9688`
- Both URLs returned HTTP 200 during verification.

## 18. Negative test cases

Executed:

- Invoice already paid: creating another payment intent returned 400 `Invoice is not open for payment`.
- Duplicate submit: resubmitting the same signed payment intent returned the existing confirmed payment and same txHash.
- Insufficient balance: high-value payment submit returned 400 `op_underfunded`.
- Unfunded source account: payment intent creation returned 400 `Source Stellar account is not funded on Testnet`.
- Expired invoice: payment intent creation returned 400 `Invoice payment link has expired`.

Not executed because they require a real Freighter/browser session or fault injection:

- Freighter not installed.
- Wallet locked.
- User rejects signature.
- Wrong network in Freighter.
- Browser refresh while pending.
- Horizon unavailable.
- Stellar RPC unavailable.
- Contract invocation failed.
- Database update failed after blockchain already confirmed.

## 19. Build and test results

Frontend:

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS.
- `npm run build`: PASS outside sandbox; Vite initially hit sandbox `spawn EPERM`, then built successfully.

Backend:

- `npm run lint`: PASS with 32 warnings.
- `npm run typecheck`: PASS after fixes.
- `npm run test`: PASS.
- `npm run test:e2e`: PASS.
- `npm run build`: PASS.

Contracts:

- `cargo fmt --check`: PASS.
- `cargo clippy --all-targets --all-features -- -D warnings`: PASS outside sandbox.
- `cargo test`: BLOCKED by Windows file lock in default `target` directory, `os error 32`.
- `cargo test -j 1 --target-dir target-codex-e2e-serial`: PASS, 4 tests.
- `stellar contract build`: PASS after retry outside sandbox; both WASM files built.

## 20. Bugs found

- Refund submit confirmed `refunds` but did not update the matching `blockchain_transactions` row with txHash, ledger, and `SUCCESS`.
- Invoice numbers were generated from per-merchant count while `invoiceNumber` is globally unique, causing a 500 when another merchant created `LM-2026-000001`.
- Unfunded payer account during payment intent creation bubbled up as a 500 instead of a clear client error.
- Seed data used invalid Stellar public keys.

## 21. Bugs fixed

- Updated refund submit synchronization in `backend/src/payments/payments.service.ts`.
- Reworked invoice number generation in `backend/src/invoices/invoices.service.ts` to avoid global uniqueness collisions.
- Added Horizon source-account error handling in `backend/src/stellar/stellar.service.ts`.
- Replaced invalid seed public keys with valid funded Testnet public keys in `backend/prisma/seed.ts`.

## 22. Remaining blockers

- Freighter UI E2E is still not executed. The direct payment and refund transactions are real Testnet transactions, but they were signed by the E2E script using Stellar SDK keypairs, not by Freighter.
- Escrow/Soroban flows are not production-ready: no deployed contract IDs, no generated bindings, no backend invocation service, no event indexer, and no DB event synchronization.
- Fault-injection cases are not automated: Horizon unavailable, RPC unavailable, contract invocation failed, and DB failure after confirmed blockchain transaction.
- Backend lint still reports 32 warnings around `any` request types and one floating promise warning.
- Exact `cargo test` on the default target directory is blocked by Windows file locks in this environment, although serial target tests pass.

## 23. Production readiness assessment

Not production-ready.

The direct XLM backend path is now materially stronger: it creates real payment intents, verifies Horizon transactions before marking payments confirmed, writes real txHashes and ledgers, generates receipts, and synchronizes refund blockchain records. However, the requested full product E2E cannot be marked PASS because Freighter UI signing and all Soroban escrow/dispute/event flows remain unverified or unimplemented against real deployed contracts.
