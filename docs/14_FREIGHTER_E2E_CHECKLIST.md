# Freighter E2E Checklist

Use Stellar Testnet only. Do not use real funds.

## Wallet

- Install and unlock Freighter.
- Switch Freighter to Stellar Testnet.
- Connect wallet from the landing page.
- Sign the Lumora Pay auth challenge.
- Confirm `/auth/me` returns the authenticated user.
- Switch Freighter to a non-Testnet network and confirm the UI blocks signing.

## Direct Invoice Payment

- Create merchant profile if dashboard shows onboarding.
- Create a direct XLM invoice with at least one line item.
- Open Invoice Detail and copy the public checkout link.
- Open `/pay/:publicToken` in a customer browser session.
- Connect customer Freighter wallet.
- Confirm real Horizon balance is shown.
- Click Pay and review amount, destination, memo, and network in Freighter.
- Reject signature and confirm the page shows failed state without marking invoice paid.
- Retry, sign, and submit.
- Confirm success appears only after backend returns `CONFIRMED`.
- Open Stellar Expert from Payment Success and verify the real txHash.
- Refresh the paid invoice detail and confirm status remains `PAID`.
- Open receipt and confirm hash, ledger, fee, source, destination, memo, and network.

## Duplicate and Pending Safety

- Double-click Pay and confirm only one confirmed payment is created.
- Refresh during processing and use payment intent status to recover.
- Try paying an already paid invoice and confirm backend rejects it.
- Try insufficient balance and confirm no fake success is displayed.

## Refund

- Open a confirmed payment.
- Prepare a refund from the merchant account.
- Confirm Freighter signs from the merchant wallet, not a deployer key.
- Submit signed refund XDR.
- Confirm refund txHash appears only after Horizon verification.
- Confirm invoice status is `REFUNDED` or `PARTIALLY_REFUNDED`.

## Escrow and Soroban

- Set real `PAYMENT_ESCROW_CONTRACT_ID` and `INVOICE_REGISTRY_CONTRACT_ID`.
- Generate TypeScript bindings from deployed contracts.
- Create escrow invoice.
- Prepare create escrow invocation and confirm Freighter signs the expected source.
- Submit to Stellar RPC and poll final status, not just pending submit status.
- Deposit escrow funds and verify on-chain state.
- Release escrow and verify event/state before UI success.
- Refund escrow and confirm refund after release is disabled.
- Open dispute with reason and evidence hash if contract endpoint is available.

## Faucet and History

- Request Testnet XLM for connected wallet.
- Confirm balance refresh succeeds after Friendbot call.
- Open Wallet History and verify Horizon/database transactions have Stellar Expert links.
