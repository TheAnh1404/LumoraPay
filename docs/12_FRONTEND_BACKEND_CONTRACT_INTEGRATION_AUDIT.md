# Lumora Pay Integration Audit

Audit date: 2026-07-16

Scope note: this file records the initial state found before integration work. The final implemented state and validation results are captured in `docs/15_FULL_INTEGRATION_REPORT.md`.

## Current Architecture

Lumora Pay is split into `frontend/` (React, Vite, Zustand, Freighter), `backend/` (NestJS, Prisma, PostgreSQL, Stellar SDK), `contracts/` (Soroban Rust workspace), and `docs/`.

The backend is mounted under `/api/v1`. Existing modules are `auth`, `merchants`, `customers`, `invoices`, `payments`, `stellar`, `health`, and `prisma`. There are no active `wallets`, `refunds`, `contracts`, `escrows`, or event-indexer backend modules yet.

## Frontend Pages Using Mock or Fake Runtime Data

- `CustomerDetail.tsx` imports `mockCustomers`.
- `Customers.tsx` imports `mockCustomers`.
- `PaymentSuccess.tsx` falls back to `PAY-MOCK-1`, a hard-coded txHash, ledger, wallets, and timestamp.
- `Receipt.tsx` falls back to a hard-coded payment, txHash, ledger, customer, and merchant data.
- `LandingPage.tsx` imports `mockInvoices` for a demo invoice.
- `Developers.tsx` displays fake publishable/secret API keys.
- `frontend/src/services/stellar.service.ts` returns mock XDR, mock verification, and mock faucet success.
- `ProcessingPayment.tsx` text mentions a "zero-value test network sequence envelope", which is not true for real payment flow.

## API Endpoints Currently Implemented

- `POST /auth/wallet/challenge`
- `POST /auth/wallet/verify`
- `GET /merchants/current`
- `GET /merchants/current/dashboard`
- `POST /customers`
- `GET /customers`
- `GET /customers/:id`
- `POST /invoices`
- `GET /invoices`
- `GET /invoices/public/:publicToken`
- `GET /invoices/:id`
- `POST /invoices/:id/cancel`
- `POST /payments/public/invoices/:publicToken/payment-intents`
- `POST /payments/public/payment-intents/:invoiceId/submit`
- `GET /payments`
- `POST /payments/faucet`
- `GET /health`
- `GET /health/database`
- `GET /health/stellar`

## API Endpoints Missing or Not Yet Used Correctly

- Missing auth: `GET /auth/me`, `POST /auth/logout`.
- Missing merchant mutation: `POST /merchants`, `PATCH /merchants/current`.
- Missing customer mutation: `PATCH /customers/:id`, `DELETE /customers/:id`.
- Missing invoice workflow: `PATCH /invoices/:id`, `POST /invoices/:id/open`, `POST /invoices/:id/duplicate`, spec-compliant `GET /public/invoices/:publicToken`.
- Payment intent flow is route-incompatible with the target spec and uses invoice id as submit id.
- Missing payment detail/status/receipt/hash endpoints.
- Missing wallet endpoints for balance and transaction history.
- Missing `/stellar/faucet`.
- Missing direct refund endpoints.
- Missing escrow and contract endpoints.

## Buttons Without Complete Real Behavior

- Checkout `Pay` mutates local invoice state to `PAID` after submit instead of reloading verified backend status.
- Invoice Detail `Refund Invoice` has no implementation.
- Settings save only displays local success.
- Checkout Links and Invoice Detail open `/pay/:id` even though public checkout needs `publicToken`.
- Developers webhook/API key buttons are UI-only.
- Transaction History reads local payment store only.

## Backend Gaps

- `AuthService.verifyChallenge` silently creates a default merchant; this conflicts with explicit onboarding requirements.
- Payment submit verifies after Horizon submission, but does not persist payment, invoice, blockchain transaction, and audit state in one DB transaction.
- No idempotency guard for duplicate payment submit.
- No status polling endpoint.
- No receipt endpoint.
- No refund service.
- No contract client, Soroban RPC transaction service, event service, or indexer.
- `HealthController` uses a hard-coded test address.
- `STELLAR_DEPLOYER_SECRET` exists in backend config even though user transactions must not use deployer secrets.

## Contract Functions

`invoice-registry` functions:

- `initialize(admin)`
- `create_invoice(invoice_id, merchant, customer, token, amount, metadata_hash, due_at)`
- `cancel_invoice(invoice_id)`
- `mark_paid(invoice_id, payment_reference)`
- `mark_refunded(invoice_id, refund_reference)`
- `get_invoice(invoice_id)`
- `get_admin()`

`payment-escrow` functions:

- `initialize(admin, fee_recipient, platform_fee_bps)`
- `create_escrow(escrow_id, invoice_id, payer, merchant, token, amount, release_deadline)`
- `deposit(escrow_id)`
- `release(escrow_id)`
- `refund(escrow_id)`
- `open_dispute(escrow_id, evidence_hash)`
- `resolve_dispute(escrow_id, merchant_amount, payer_amount)`
- `get_escrow(escrow_id)`
- `get_balance(escrow_id)`

No backend API wrappers exist for any contract function. No generated TypeScript bindings are present. `payment-escrow` does not currently publish escrow lifecycle events, so the requested escrow event indexer cannot be complete without a contract update and redeploy.

## Environment and Contract IDs

- Backend `.env.example` defines Stellar network, Horizon, RPC, Expert base URL, and blank contract IDs.
- Frontend has no `.env.example` yet.
- `INVOICE_REGISTRY_CONTRACT_ID` and `PAYMENT_ESCROW_CONTRACT_ID` are blank. No deployment file with real contract IDs was found.
- Direct XLM flow can run without contract IDs. Contract endpoints must fail clearly until real deployment IDs are provided.

## Current Stellar Config

- Network: `TESTNET`
- Passphrase: `Test SDF Network ; September 2015`
- Horizon: `https://horizon-testnet.stellar.org`
- RPC: `https://soroban-testnet.stellar.org`
- Stellar Expert: `https://stellar.expert/explorer/testnet`

## Type and Enum Mismatches

- Prisma uses uppercase statuses; frontend generally expects uppercase but payment UI uses lowercase local progress states.
- Prisma `InvoiceStatus` includes `FAILED`, but the requested shared enum does not.
- Prisma `PaymentStatus` includes `REVERSED`, but the requested shared enum does not.
- Frontend `Payment` and `Invoice` types come from mock files, not API contracts.
- Public checkout and payment pages use `amount` while backend database stores `totalAmount` and returns formatted strings.

## Immediate Integration Priorities

1. Add shared frontend/backend status types and centralized mappers.
2. Add a typed frontend API client and replace hard-coded axios calls.
3. Replace mock Freighter/Stellar services with real Freighter, Horizon balance, and backend transaction flow.
4. Normalize public invoice/payment-intent routes.
5. Store payment intent state in PostgreSQL and update invoice/payment/blockchain transaction atomically after Horizon verification.
6. Add wallet, receipt, refund, contract-health, and escrow placeholder endpoints with clear missing-contract-ID errors.
7. Replace active production imports of mock data.
