# 01 — Current Project Audit

**Date:** 2026-07-15
**Auditor:** Automated analysis of complete frontend source

---

## 1. Current Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 24.15.0 |
| Language | TypeScript | 6.0.2 |
| UI Framework | React | 19.2.7 |
| Build Tool | Vite | 8.1.1 |
| Styling | Tailwind CSS | 3.4.19 |
| State Mgmt | Zustand | 5.0.14 |
| Routing | react-router-dom | 7.18.1 |
| Forms | react-hook-form + zod | 7.81.0 / 4.4.3 |
| Charts | Recharts | 3.9.2 |
| Icons | lucide-react | 1.24.0 |
| QR Codes | qrcode.react | 4.2.0 |
| Backend | **NONE** | — |
| Database | **NONE** | — |
| Blockchain SDK | **NONE** | — |
| Wallet Extension | **NONE** | — |

### Dead Dependencies (installed but never imported)
- `antd` v6.5.1
- `@tanstack/react-query` v5.101.2

---

## 2. Pages (20 total)

| Page | Route | File |
|------|-------|------|
| Landing | `/` | `LandingPage.tsx` |
| Dashboard | `/app` | `DashboardOverview.tsx` |
| Invoice List | `/app/invoices` | `InvoiceList.tsx` |
| Create Invoice | `/app/invoices/create` | `CreateInvoice.tsx` |
| Invoice Detail | `/app/invoices/:invoiceId` | `InvoiceDetail.tsx` |
| Customers | `/app/customers` | `Customers.tsx` |
| Customer Detail | `/app/customers/:customerId` | `CustomerDetail.tsx` |
| Payments | `/app/payments` | `Payments.tsx` |
| Checkout Links | `/app/checkout-links` | `CheckoutLinks.tsx` |
| Developers | `/app/developers` | `Developers.tsx` |
| Settings | `/app/settings` | `Settings.tsx` |
| Checkout | `/pay/:publicToken` | `Checkout.tsx` |
| Processing | `/pay/:publicToken/processing` | `ProcessingPayment.tsx` |
| Success | `/pay/:publicToken/success` | `PaymentSuccess.tsx` |
| Failed | `/pay/:publicToken/failed` | `PaymentFailed.tsx` |
| Receipt | `/receipt/:receiptId` | `Receipt.tsx` |
| Faucet | `/faucet` | `TestnetFaucet.tsx` |
| Tx History | `/wallet/history` | `TransactionHistory.tsx` |
| Design Guide | `/design-guide` | `DesignGuide.tsx` |
| Not Found | `/*` | `NotFound.tsx` |

---

## 3. Mock Data Inventory

### `mocks/invoices.ts`
- 7 hardcoded invoices with fake IDs, amounts, Stellar addresses
- `Invoice` and `InvoiceItem` TypeScript interfaces

### `mocks/payments.ts`
- 2 hardcoded payments with **fake transaction hashes** and **fake ledger numbers**
- `Payment` TypeScript interface

### `mocks/customers.ts`
- 4 hardcoded customers with invalid Stellar G-addresses
- `Customer` TypeScript interface

### `mocks/dashboard.ts`
- Hardcoded stats: totalReceived, paidInvoices, openInvoices, paymentSuccessRate
- 7-day revenue chart data

---

## 4. Mock Services

### `services/wallet.service.ts`
- `WalletProvider` interface (well-designed for swap)
- `MockFreighterWalletProvider` class:
  - `isInstalled()` → always `true`
  - `connect()` → 800ms delay, returns hardcoded address
  - `getBalance()` → always `'150.00000'`
  - `signTransaction()` → 1500ms delay, returns fake XDR string

### `services/stellar.service.ts`
- `buildPaymentTx()` → 500ms delay, returns `MOCK_XDR` string
- `estimateFee()` → hardcoded `'0.00001 XLM'`
- `verifyTransaction()` → 1000ms delay, always `true`
- `fundFromFaucet()` → 2000ms delay, always `true`

### `services/invoice.service.ts`
- Delegates to in-memory Zustand store

### `services/payment.service.ts`
- Delegates to `usePaymentStore.startPayment()` (all fake)

---

## 5. Mock Store Behavior

### `wallet.store.ts`
- `isInstalled: true` hardcoded
- `balance: '150.00000'` hardcoded
- `connect()`: 800ms delay → hardcoded address
- `requestFaucet()`: 1500ms delay → in-memory balance +100

### `payment.store.ts`
- `startPayment()`: 5 seconds of setTimeout stages → fake hash, fake ledger, always succeeds
- `payments` seeded from mockPayments array

### `invoice.store.ts`
- `invoices` seeded from mockInvoices array
- All CRUD is in-memory only

---

## 6. UI Functions Not Connected to Real Systems

| Function | Location | Current Behavior |
|----------|----------|-----------------|
| Connect Wallet | DashboardLayout, MarketingLayout | Fake 800ms connect |
| Pay Invoice | Checkout.tsx | Fake 5s payment simulation |
| Create Invoice | CreateInvoice.tsx | In-memory store, no backend |
| Cancel Invoice | InvoiceDetail.tsx | In-memory status change |
| Refund Invoice | InvoiceDetail.tsx | In-memory status change |
| Request Faucet | TestnetFaucet.tsx, DashboardOverview | Fake balance increment |
| Save Settings | Settings.tsx | No-op with success toast |
| Save Webhook | Developers.tsx | Non-functional |
| View on Stellar Expert | PaymentSuccess, Receipt, Payments | Links use fake tx hashes |
| Export CSV | InvoiceList.tsx | ✅ Works (client-side) |
| Print Receipt | Receipt.tsx | ✅ Works (window.print) |

---

## 7. Dependencies to Add

### Backend
- NestJS, Prisma, PostgreSQL driver
- `@stellar/stellar-sdk`, JWT, Helmet, CORS, Pino, class-validator, Swagger

### Frontend
- `@stellar/freighter-api` — real Freighter wallet integration
- `@stellar/stellar-sdk` — transaction building
- Axios or fetch wrapper for backend API calls

### Smart Contracts
- Soroban SDK (Rust), stellar CLI (already installed v26.0.0)

---

## 8. Integration Risks

1. **WalletProvider interface**: Well-designed; swap should be clean
2. **Invoice type mismatch**: Frontend `Invoice` interface doesn't match required DB schema (missing `publicToken`, `merchantId`, `assetId`, etc.)
3. **Payment type mismatch**: Frontend `Payment` lacks `paymentIntentId`, blockchain verification fields
4. **Direct store mutation**: `Checkout.tsx:65` does `invoice.status = 'PAID'` (Zustand mutation bug)
5. **No error boundaries**: No React error boundaries exist
6. **No API layer**: Zero HTTP client setup — need to create complete API service layer
7. **Hardcoded merchant**: "The Anh Studio" and wallet address hardcoded in multiple pages

---

## 9. Deployment Plan

### Phase 1: Database & Backend Core
- Prisma schema with full enum/table definitions
- Run migration against "Lumora Pay" database
- NestJS modules: auth, merchants, customers, invoices, payments
- Seed with XLM Testnet asset + demo data (no fake confirmed payments)

### Phase 2: Stellar Integration
- Replace wallet.service.ts with real Freighter
- Replace stellar.service.ts with real Horizon/SDK calls
- Implement payment intent flow: build → sign → submit → verify

### Phase 3: Smart Contracts
- Build invoice-registry and payment-escrow in Rust/Soroban
- Test, build, deploy to Testnet (when deployer secret available)

### Phase 4: Frontend Integration
- Create API client service layer
- Replace all stores with API-backed implementations
- Connect checkout flow to real Stellar transactions
