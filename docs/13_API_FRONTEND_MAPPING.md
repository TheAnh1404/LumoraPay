# API Frontend Mapping

| Frontend Page | Frontend Action | API Endpoint | HTTP Method | Request DTO | Response DTO | Auth Required | Wallet Required | Blockchain Transaction | Current Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marketing/Dashboard Layout | Wallet auth challenge | `/auth/wallet/challenge` | POST | `{ walletAddress, network }` | `{ nonce, message }` | No | Freighter | No | Connected |
| Marketing/Dashboard Layout | Verify signed challenge | `/auth/wallet/verify` | POST | `{ walletAddress, nonce, signature }` | `{ accessToken, user, merchant }` | No | Freighter | Signature only | Connected |
| Dashboard | Load current user | `/auth/me` | GET | none | user, wallets, merchant | Yes | No | No | Connected |
| Dashboard | Create merchant onboarding | `/merchants` | POST | business name, slug, support email, wallet | merchant | Yes | Connected wallet address | No | Connected |
| Dashboard | Metrics | `/merchants/current/dashboard` | GET | none | dashboard stats | Yes | No | No | Connected |
| Settings | Update merchant | `/merchants/current` | PATCH | merchant profile fields | merchant | Yes | Optional | No | Connected |
| Customers | List customers | `/customers` | GET | query implicit | customer list | Yes | No | No | Connected |
| Customers | Create customer | `/customers` | POST | customer fields | customer | Yes | No | No | Connected |
| Customer Detail | View customer | `/customers/:id` | GET | path id | customer, invoices, payments | Yes | No | No | Connected |
| Customer Detail | Edit customer | `/customers/:id` | PATCH | customer fields | customer | Yes | No | No | Backend connected, UI edit pending |
| Invoice Create | Create invoice | `/invoices` | POST | `CreateInvoiceRequest` | invoice | Yes | Merchant wallet configured | No | Connected |
| Invoice List | List invoices | `/invoices` | GET | none | invoice list | Yes | No | No | Connected |
| Invoice Detail | View invoice | `/invoices/:id` | GET | path id | invoice | Yes | No | No | Connected |
| Invoice Detail | Cancel invoice | `/invoices/:id/cancel` | POST | none | invoice | Yes | No | No | Connected |
| Invoice Detail | Duplicate invoice | `/invoices/:id/duplicate` | POST | none | invoice | Yes | No | No | Backend connected, UI button pending |
| Checkout | Load public invoice | `/public/invoices/:publicToken` | GET | public token | invoice | No | No | No | Connected |
| Checkout | Create payment intent | `/public/invoices/:publicToken/payment-intents` | POST | `{ payerWallet }` | unsigned XDR intent | No | Freighter public key | Builds XDR only | Connected |
| Checkout | Submit signed payment | `/payment-intents/:id/submit` | POST | `{ signedXdr, payerWallet }` | payment | No | Freighter signed XDR | Horizon submit + verify | Connected |
| Checkout/Processing | Poll status | `/payment-intents/:id/status` | GET | intent id | status/payment | No | No | Horizon/database | Connected |
| Payments | List merchant payments | `/payments` | GET | none | payment list | Yes | No | No | Connected |
| Payment Success | Load payment | `/payments/:id` | GET | payment id | payment | No | No | No | Connected |
| Receipt | Load receipt | `/payments/:id/receipt` | GET | payment id | receipt | No | No | No | Connected |
| Payments | Find payment by hash | `/payments/hash/:transactionHash` | GET | hash | payment | Yes | No | Horizon tx hash | Connected |
| Refund Modal | Prepare refund | `/payments/:id/refunds/prepare` | POST | amount, reason | unsigned XDR | Yes | Merchant Freighter | Builds XDR only | Backend connected, UI pending |
| Refund Modal | Submit refund | `/refunds/:id/submit` | POST | signed XDR | refund result | Yes | Merchant Freighter | Horizon submit + verify | Backend connected, UI pending |
| Wallet History | Wallet tx history | `/wallets/:address/transactions` | GET | address | transaction list | Yes | Connected wallet | Horizon + database | Connected |
| Dashboard/Faucet | Wallet balance | `/wallets/:address/balance` | GET | address | balances | No | Wallet address | Horizon query | Connected |
| Faucet | Fund testnet account | `/stellar/faucet` | POST | `{ address }` | faucet result + balance | No | Address | Friendbot/Horizon | Connected |
| Contracts | Contract config | `/contracts/config` | GET | none | config | No | No | No | Connected |
| Escrow UI | Escrow endpoints | `/escrows/:id/*` | GET/POST | varies | clear 503 until bindings/IDs | Mixed | Freighter for signing | Soroban | Placeholder, no fake success |
