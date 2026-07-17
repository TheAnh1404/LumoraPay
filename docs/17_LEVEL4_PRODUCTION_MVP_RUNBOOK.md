# Level 4 Production MVP Runbook

This document maps the Level 4 requirements to concrete Lumora Pay evidence, commands, and remaining owner actions.

## Requirement Status

| Requirement | Repository Support | External Evidence Still Required |
| --- | --- | --- |
| Production MVP | Direct XLM invoices, checkout, payment verification, refunds, receipts, merchant dashboard, wallet history, faucet, pilot feedback, and pilot analytics are implemented. | Production URL and real user testing evidence. |
| Stable frontend and smart contract architecture | React app is modularized by pages/services/stores. Backend is split into Nest modules. Contracts are split into `invoice-registry` and `payment-escrow`. | Production incident-free test window. |
| Mobile responsive UI | Dashboard, checkout, invoices, customers, receipts, and settings use responsive Tailwind layouts. | Mobile demo recording or screenshots. |
| Loading states and error handling | Payment, checkout, wallet, customer, invoice, refund, faucet, and settings flows expose loading/error states. | Browser QA checklist results. |
| Minimum 10 real users onboarded | `GET /api/v1/pilot/overview` reports verified wallets and unique interacted wallets. | At least 10 real users must connect Freighter on Testnet. |
| Proof of wallet interactions | `/pilot/wallet-interactions` records connect, restore, faucet, signed XDR, submitted payment, confirmed payment, refund, and Soroban actions. | Export DB rows or screenshots from `/pilot/overview`. |
| Feedback collection | `/pilot/feedback` and Settings feedback form are implemented. | Feedback from users must be collected and exported. |
| Production deployment | CI/CD deploy gate is present in `.github/workflows/ci.yml`. | Public frontend/backend production URLs and configured deployment secrets. |
| Monitoring and analytics | `/pilot/events` captures page views, client runtime errors, page performance, and internal product events. `/pilot/overview` summarizes pilot readiness. | Optional external monitoring provider for production incidents. |
| Project structure and documentation | Root README, docs, API mapping, Freighter checklist, E2E report, and this runbook exist. | Keep deployment-specific docs updated after launch. |
| Smart contracts deployed on Stellar Testnet | `scripts/deploy-contracts-testnet.ps1` builds, deploys, initializes, and writes contract IDs. | Funded deployer identity/secret and deployed contract IDs. |
| Minimum 15+ meaningful commits | CI is ready for GitHub. | Repository must be initialized/pushed and 15+ meaningful commits made. |
| Public GitHub repository | CI workflow is included. | Create public GitHub repo and push code. |
| Live demo video | Demo checklist below. | Record video after production deploy and Testnet contract deploy. |

## Production Deployment Checklist

1. Create a public GitHub repository.
2. Push this workspace with at least 15 meaningful commits. Recommended commit sequence:
   - `Initialize Lumora Pay monorepo`
   - `Add NestJS payment backend`
   - `Add Prisma payment schema`
   - `Add React invoice dashboard`
   - `Add Freighter wallet authentication`
   - `Add public checkout flow`
   - `Add Horizon payment verification`
   - `Add refund workflow`
   - `Add wallet history and faucet`
   - `Add Soroban invoice registry contract`
   - `Add Soroban payment escrow contract`
   - `Add contract tests and snapshots`
   - `Add pilot analytics and feedback`
   - `Add CI/CD pipeline`
   - `Add production MVP documentation`
3. Configure production database and run migrations:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
4. Deploy backend with production env:
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `FRONTEND_URL`
   - `STELLAR_NETWORK=TESTNET`
   - `STELLAR_HORIZON_URL`
   - `STELLAR_RPC_URL`
   - `INVOICE_REGISTRY_CONTRACT_ID`
   - `PAYMENT_ESCROW_CONTRACT_ID`
5. Deploy frontend with public env:
   - `VITE_API_BASE_URL`
   - `VITE_STELLAR_NETWORK=TESTNET`
   - `VITE_INVOICE_REGISTRY_CONTRACT_ID`
   - `VITE_PAYMENT_ESCROW_CONTRACT_ID`
6. Add deployment hook secrets to GitHub:
   - `BACKEND_DEPLOY_HOOK`
   - `FRONTEND_DEPLOY_HOOK`
   - `PRODUCTION_DATABASE_URL`
   - `INVOICE_REGISTRY_CONTRACT_ID`
   - `PAYMENT_ESCROW_CONTRACT_ID`
7. Run the manual production deploy gate from GitHub Actions with `deploy_production=true`.

## Stellar Testnet Contract Deployment

Prerequisites:

- Stellar CLI configured with Testnet.
- A funded deployer identity or secret.
- Admin public key.
- Fee recipient public key.

Run from the repository root:

```powershell
.\scripts\deploy-contracts-testnet.ps1 `
  -SourceAccount lumora-deployer `
  -AdminPublicKey GADMIN_PUBLIC_KEY `
  -FeeRecipientPublicKey GFEE_RECIPIENT_PUBLIC_KEY `
  -PlatformFeeBps 50
```

The script writes:

```text
contracts/deployments/testnet.latest.env
```

Copy those values into backend and frontend production environments.

## 10 User Pilot Evidence

Each real user should:

1. Open the production frontend.
2. Connect Freighter on Stellar Testnet.
3. Complete wallet authentication.
4. Create or pay one invoice, or use the faucet and wallet history.
5. Submit feedback from Settings.

Check progress:

```text
GET /api/v1/pilot/overview
```

Evidence to capture:

- Screenshot of `verifiedWallets >= 10`.
- Screenshot or export of `uniqueInteractedWallets >= 10`.
- Screenshot or export of feedback response count.
- Sample rows from `wallet_interactions`.
- Sample rows from `product_feedback`.

## Demo Video Checklist

Record one continuous walkthrough:

1. Show public production URL and GitHub repository.
2. Connect Freighter on Stellar Testnet.
3. Show dashboard onboarding and pilot evidence card.
4. Create a merchant profile if needed.
5. Create an invoice with at least one line item.
6. Open public checkout link in a customer flow.
7. Sign a payment in Freighter.
8. Show loading state while backend confirms.
9. Show success page, receipt, transaction hash, ledger, and Stellar Expert link.
10. Submit user feedback from Settings.
11. Show `/pilot/overview` or Settings Level 4 card.
12. Show contract IDs and `/contracts/*/health` after Testnet deployment.

## Review Talking Points

- Technical complexity: wallet auth, signed XDR generation, Horizon verification, Prisma consistency, Soroban escrow contracts.
- Product quality: public checkout, receipts, refund flow, mobile dashboard, feedback loop.
- Architecture quality: frontend service/store split, Nest modules, Prisma schema, contract workspace, CI/CD gate.
- Real-world usefulness: merchants can invoice customers and settle verified Testnet payments without custodial private keys.
