# Lumora Pay

Lumora Pay is a Stellar Testnet payment platform for creating invoices, accepting wallet-signed XLM payments, issuing verified refunds, and preparing Soroban escrow workflows. The project is split into a React frontend, a NestJS backend, Prisma/PostgreSQL persistence, and two Soroban smart contracts.

The current production-ready path is direct XLM invoice payment with backend XDR verification and Horizon confirmation. Soroban escrow contracts build and test successfully, but live escrow flows still require deployed contract IDs, generated bindings, and an event indexing/deployment workflow before they should be treated as production-ready.

## Key Features

- Freighter wallet connection, network validation, and wallet-signature authentication.
- Merchant dashboard for invoices, payments, customers, checkout links, settings, wallet history, and Testnet faucet access.
- Public checkout pages for invoice payment links.
- Backend-generated Stellar XDR for payment intents and refunds.
- Signed XDR validation before submission: source, destination, amount, memo, network, and transaction shape.
- Horizon confirmation before invoices, payments, refunds, and blockchain transaction records are marked successful.
- Receipt pages with transaction hash, ledger, fee, source, destination, memo, network, and Stellar Expert links.
- Soroban `invoice-registry` and `payment-escrow` contracts with events, auth checks, escrow deposit/release/refund/dispute flows, and Rust tests.
- Prisma schema for users, wallets, merchants, invoices, payments, refunds, escrows, blockchain transactions, contract deployments, contract events, webhooks, and audit logs.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS, Zustand, React Hook Form, Zod, Freighter API, Stellar SDK |
| Backend | NestJS 11, TypeScript, Prisma, PostgreSQL, JWT, Passport, Helmet, Stellar SDK |
| Smart contracts | Rust, Soroban SDK 22, Stellar CLI |
| Blockchain network | Stellar Testnet, Horizon Testnet, Soroban Testnet RPC |

## Repository Structure

```text
LumoraPay/
  frontend/                 Vite React application
    src/pages/              Marketing, dashboard, checkout, receipt, wallet pages
    src/components/         Layout and wallet UI components
    src/services/api/       Backend API clients
    src/services/stellar/   Freighter, Stellar, Soroban, polling helpers
    src/stores/             Zustand stores for wallet, invoices, payments, UI
    src/types/              Shared frontend DTO and status types

  backend/                  NestJS API
    src/auth/               Wallet challenge, signature verification, JWT auth
    src/merchants/          Merchant profile and dashboard APIs
    src/customers/          Customer CRUD APIs
    src/invoices/           Invoice CRUD and public invoice APIs
    src/payments/           Payment intent, refund, receipt, and payment APIs
    src/wallets/            Balance and wallet transaction history APIs
    src/stellar/            Horizon, Friendbot, Soroban transaction services
    src/contracts/          Contract configuration and health APIs
    src/escrows/            Soroban escrow prepare/submit APIs
    prisma/                 Prisma schema, migrations, seed data
    test/                   Nest e2e test config and specs

  contracts/                Soroban Rust workspace
    contracts/invoice-registry/
    contracts/payment-escrow/

  docs/                     Audits, API mapping, E2E reports, Freighter checklist
  scripts/                  Integration helper scripts
```

## Architecture

```text
Freighter Wallet
      |
      | signed auth message / signed XDR
      v
React Frontend  <-------------------------->  NestJS API
      |                                         |
      | public checkout + dashboard             | Prisma
      |                                         v
      |                                   PostgreSQL
      |                                         |
      |                                         | Horizon/RPC verification
      v                                         v
Stellar Expert links                  Stellar Horizon / Soroban RPC
                                                |
                                                v
                                  Soroban Contracts (build-ready)
```

The frontend never stores private keys or submits fake transaction hashes. The backend builds XDR, validates signed transactions, submits to Stellar services, polls for final status, and then updates database state.

## Prerequisites

- Node.js and npm.
- PostgreSQL.
- Rust toolchain with the target required by Stellar CLI.
- Stellar CLI with Soroban contract support.
- Freighter browser extension for real wallet-signing flows.
- Stellar Testnet accounts funded through Friendbot or the in-app faucet.

## Environment Setup

Create local environment files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

On Windows PowerShell:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Backend variables:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/lumorapay?schema=public"
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
FRONTEND_URL=http://localhost:5173
STELLAR_NETWORK=TESTNET
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_EXPERT_BASE_URL=https://stellar.expert/explorer/testnet
INVOICE_REGISTRY_CONTRACT_ID=
PAYMENT_ESCROW_CONTRACT_ID=
PLATFORM_FEE_RECIPIENT=
PLATFORM_FEE_BPS=50
```

Frontend variables:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_STELLAR_NETWORK=TESTNET
VITE_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_EXPERT_BASE_URL=https://stellar.expert/explorer/testnet
VITE_INVOICE_REGISTRY_CONTRACT_ID=
VITE_PAYMENT_ESCROW_CONTRACT_ID=
```

Do not commit `.env` files. Frontend config must stay limited to public `VITE_*` values.

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

The backend runs at:

```text
http://localhost:3000/api/v1
```

Useful health checks:

```text
GET /api/v1/health
GET /api/v1/health/database
GET /api/v1/health/stellar
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

### 3. Contracts

```bash
cd contracts
cargo fmt --check
cargo test
stellar contract build
```

Build artifacts are produced under `contracts/target/wasm32v1-none/release/`.

## Main Workflows

### Wallet Authentication

1. User connects Freighter.
2. Frontend requests an auth challenge from `/auth/wallet/challenge`.
3. User signs the challenge in Freighter.
4. Backend verifies the Stellar signature and returns a JWT from `/auth/wallet/verify`.
5. Authenticated dashboard APIs use the JWT bearer token.

### Direct XLM Payment

1. Merchant creates an invoice.
2. Customer opens `/pay/:publicToken`.
3. Backend creates a payment intent and unsigned Stellar XDR.
4. Customer signs the XDR in Freighter.
5. Backend validates the signed XDR, submits it to Horizon, polls final status, and verifies the resulting operation.
6. Database updates payment, blockchain transaction, invoice, and audit records only after confirmation.
7. Customer sees a success page and receipt with Stellar Expert links.

### Refund

1. Merchant prepares a refund for a confirmed payment.
2. Backend builds refund XDR.
3. Merchant signs with Freighter.
4. Backend submits, verifies Horizon results, and updates refund/payment/invoice state.

### Soroban Escrow

The repository includes a `payment-escrow` contract and backend escrow endpoints for create, deposit, release, refund, dispute, and dispute resolution flows. These flows require real deployed contract IDs:

```env
INVOICE_REGISTRY_CONTRACT_ID=
PAYMENT_ESCROW_CONTRACT_ID=
```

Until those values are set and the deployment/binding workflow is completed, escrow APIs should be treated as gated or unavailable for production use.

## API Overview

All backend routes are mounted under `/api/v1`.

| Domain | Routes |
| --- | --- |
| Auth | `/auth/wallet/challenge`, `/auth/wallet/verify`, `/auth/me`, `/auth/logout` |
| Merchants | `/merchants`, `/merchants/current`, `/merchants/current/dashboard` |
| Customers | `/customers`, `/customers/:id` |
| Invoices | `/invoices`, `/invoices/:id`, `/invoices/:id/cancel`, `/invoices/:id/open`, `/invoices/:id/duplicate`, `/public/invoices/:publicToken` |
| Payments | `/public/invoices/:publicToken/payment-intents`, `/payment-intents/:id/submit`, `/payment-intents/:id/status`, `/payments`, `/payments/:id`, `/payments/:id/receipt`, `/payments/hash/:transactionHash` |
| Refunds | `/payments/:id/refunds/prepare`, `/refunds/:id/submit`, `/refunds/:id` |
| Wallets | `/wallets/:address/balance`, `/wallets/:address/transactions` |
| Stellar | `/stellar/faucet` |
| Contracts | `/contracts/config`, `/contracts/invoice-registry/health`, `/contracts/payment-escrow/health` |
| Escrows | `/public/invoices/:publicToken/escrow-intents`, `/escrows/:id/*` |

See `docs/13_API_FRONTEND_MAPPING.md` for the detailed frontend-to-API mapping.

## Smart Contracts

### `invoice-registry`

Tracks invoice records on Soroban.

- Initialize admin.
- Create invoice.
- Cancel invoice.
- Mark invoice paid.
- Mark invoice refunded.
- Read invoice/admin state.
- Publish invoice lifecycle events.

### `payment-escrow`

Holds funds in escrow and supports dispute resolution.

- Initialize admin, fee recipient, and platform fee bps.
- Create escrow.
- Deposit token funds into the contract.
- Release funds to merchant and fee recipient.
- Refund payer.
- Open dispute with evidence hash.
- Resolve dispute with merchant/payer split.
- Read escrow state and remaining balance.
- Publish escrow lifecycle events.

## Scripts and Commands

### Frontend

```bash
cd frontend
npm run dev
npm run typecheck
npm run test
npm run lint
npm run build
npm run preview
```

Note: the current frontend `test` script runs TypeScript validation. Add Vitest, React Testing Library, or Playwright for real frontend unit/e2e coverage.

### Backend

```bash
cd backend
npm run start:dev
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run start:prod
```

`npm run lint` currently invokes ESLint with `--fix`, so use it when you are comfortable allowing formatting/codefix changes.

### Database

```bash
cd backend
npx prisma migrate dev
npx prisma migrate status
npx prisma validate
npx prisma db seed
```

### Contracts

```bash
cd contracts
cargo fmt --check
cargo test
stellar contract build
```

## Testing Status

Verified locally in this workspace:

- Frontend TypeScript check: passed.
- Frontend production build: passed, with a large bundle warning.
- Backend Jest tests: passed.
- Backend production build: passed.
- Contract formatting: passed.
- Contract Rust tests: passed.
- `stellar contract build`: passed for both contracts.

Additional documented checks:

- `docs/14_FREIGHTER_E2E_CHECKLIST.md` contains the manual Freighter browser checklist.
- `docs/16_TESTNET_E2E_REPORT.md` documents a real Testnet direct payment and refund flow signed by generated Stellar SDK keypairs, not by Freighter UI.

## Security Notes

- Never commit `.env` files or private keys.
- Frontend must only use public `VITE_*` configuration.
- The backend must remain the source of truth for XDR generation, XDR verification, Horizon/RPC polling, and database status changes.
- Do not mark payments, refunds, invoices, escrows, or disputes successful until the relevant Stellar or Soroban transaction has been verified.
- Signed XDR should be treated as sensitive runtime data and should not be persisted in browser local storage.

## Known Limitations

- CI/CD pipeline files are not present yet.
- Contract deployment scripts and deployment records are not present yet.
- `INVOICE_REGISTRY_CONTRACT_ID` and `PAYMENT_ESCROW_CONTRACT_ID` are blank in the example env files.
- Generated TypeScript bindings for deployed contracts are not present.
- Event storage exists, and contracts emit events, but a standalone event indexer and realtime streaming layer are still pending.
- Freighter UI E2E was not executed in the CLI-only environment documented under `docs/16_TESTNET_E2E_REPORT.md`.
- Frontend automated tests are limited to TypeScript validation.
- Backend lint has documented warnings in the E2E report.

## Documentation

- `docs/01_CURRENT_PROJECT_AUDIT.md` - initial project audit.
- `docs/12_FRONTEND_BACKEND_CONTRACT_INTEGRATION_AUDIT.md` - integration gap audit.
- `docs/13_API_FRONTEND_MAPPING.md` - frontend/API mapping table.
- `docs/14_FREIGHTER_E2E_CHECKLIST.md` - manual Freighter E2E checklist.
- `docs/15_FULL_INTEGRATION_REPORT.md` - full integration report.
- `docs/16_TESTNET_E2E_REPORT.md` - Testnet E2E report and remaining blockers.

## Roadmap

- Add GitHub Actions or another CI pipeline for frontend, backend, contracts, and Prisma checks.
- Add contract deployment scripts for Testnet and production environments.
- Generate and commit typed Soroban client bindings after deployment.
- Add a contract event indexer and realtime frontend updates through SSE or WebSockets.
- Add frontend unit tests and browser E2E tests for Freighter flows.
- Add demo assets: screenshots, walkthrough video, and presentation slides.
- Harden production observability, request IDs, structured logging, and fault-injection tests.

## License

No root license file is currently included. Define the project license before public distribution or commercial deployment.
