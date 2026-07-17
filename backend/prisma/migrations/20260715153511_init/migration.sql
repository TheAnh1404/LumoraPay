-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "WalletNetwork" AS ENUM ('TESTNET', 'MAINNET');

-- CreateEnum
CREATE TYPE "WalletVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MerchantRole" AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT', 'DEVELOPER', 'SUPPORT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAYMENT_PENDING', 'PAID', 'PARTIALLY_PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DIRECT', 'ESCROW', 'MILESTONE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AWAITING_SIGNATURE', 'SIGNED', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('NATIVE', 'STELLAR_ASSET', 'SOROBAN_TOKEN');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('CREATED', 'AWAITING_SIGNATURE', 'SUBMITTED', 'PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('CREATED', 'FUNDED', 'ACTIVE', 'RELEASE_PENDING', 'RELEASED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED', 'RESOLVED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'FUNDED', 'SUBMITTED', 'APPROVED', 'RELEASED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_RELEASE', 'RESOLVED_REFUND', 'RESOLVED_SPLIT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('CLASSIC_PAYMENT', 'CONTRACT_CREATE', 'CONTRACT_INVOKE', 'ESCROW_DEPOSIT', 'ESCROW_RELEASE', 'ESCROW_REFUND', 'MILESTONE_RELEASE', 'DISPUTE_OPEN', 'DISPUTE_RESOLVE', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('BUILT', 'AWAITING_SIGNATURE', 'SIGNED', 'SUBMITTED', 'PENDING', 'SUCCESS', 'FAILED', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'RETRYING', 'DISABLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255),
    "display_name" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_nonces" (
    "id" UUID NOT NULL,
    "wallet_address" VARCHAR(255) NOT NULL,
    "nonce" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "network" "WalletNetwork" NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "public_key" VARCHAR(255) NOT NULL,
    "network" "WalletNetwork" NOT NULL,
    "label" VARCHAR(255),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" "WalletVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMPTZ,
    "last_synced_ledger" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "support_email" VARCHAR(255),
    "status" "MerchantStatus" NOT NULL DEFAULT 'ACTIVE',
    "default_wallet_id" UUID NOT NULL,
    "checkout_accent" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_members" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MerchantRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "merchant_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "wallet_address" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supported_assets" (
    "id" UUID NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "issuer" VARCHAR(255),
    "contract_id" VARCHAR(255),
    "network" "WalletNetwork" NOT NULL,
    "decimals" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supported_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "customer_id" UUID,
    "invoice_number" VARCHAR(255) NOT NULL,
    "public_token" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "asset_id" UUID NOT NULL,
    "subtotal" DECIMAL(30,7) NOT NULL,
    "fee_amount" DECIMAL(30,7) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(30,7) NOT NULL,
    "amount_paid" DECIMAL(30,7) NOT NULL DEFAULT 0,
    "payment_type" "PaymentType" NOT NULL DEFAULT 'DIRECT',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "memo" VARCHAR(28) NOT NULL,
    "destination_wallet" VARCHAR(255) NOT NULL,
    "due_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "metadata_hash" VARCHAR(255),
    "on_chain_invoice_id" VARCHAR(255),
    "contract_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(20,4) NOT NULL,
    "unit_price" DECIMAL(30,7) NOT NULL,
    "total_price" DECIMAL(30,7) NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "payer_wallet" VARCHAR(255) NOT NULL,
    "receiver_wallet" VARCHAR(255) NOT NULL,
    "expected_amount" DECIMAL(30,7) NOT NULL,
    "paid_amount" DECIMAL(30,7) NOT NULL DEFAULT 0,
    "direction" "PaymentDirection" NOT NULL,
    "payment_type" "PaymentType" NOT NULL DEFAULT 'DIRECT',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "memo" VARCHAR(28),
    "transaction_hash" VARCHAR(255),
    "operation_id" VARCHAR(255),
    "ledger" BIGINT,
    "ledger_closed_at" TIMESTAMPTZ,
    "source_account" VARCHAR(255),
    "fee_charged" BIGINT,
    "result_code" VARCHAR(255),
    "failure_reason" TEXT,
    "submitted_at" TIMESTAMPTZ,
    "confirmed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "wallet_id" UUID,
    "invoice_id" UUID,
    "payment_id" UUID,
    "escrow_id" UUID,
    "kind" "TransactionKind" NOT NULL,
    "network" "WalletNetwork" NOT NULL,
    "source_account" VARCHAR(255) NOT NULL,
    "transaction_hash" VARCHAR(255),
    "unsigned_xdr" TEXT,
    "signed_xdr" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'BUILT',
    "ledger" BIGINT,
    "fee_charged" BIGINT,
    "result_code" VARCHAR(255),
    "result_xdr" TEXT,
    "error_code" VARCHAR(255),
    "error_message" TEXT,
    "submitted_at" TIMESTAMPTZ,
    "confirmed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount" DECIMAL(30,7) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'CREATED',
    "requested_by_user_id" UUID NOT NULL,
    "destination_wallet" VARCHAR(255) NOT NULL,
    "transaction_hash" VARCHAR(255),
    "ledger" BIGINT,
    "confirmed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrows" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "contract_id" VARCHAR(255) NOT NULL,
    "on_chain_escrow_id" VARCHAR(255) NOT NULL,
    "payer_wallet" VARCHAR(255) NOT NULL,
    "merchant_wallet" VARCHAR(255) NOT NULL,
    "asset_id" UUID NOT NULL,
    "amount" DECIMAL(30,7) NOT NULL,
    "platform_fee" DECIMAL(30,7) NOT NULL DEFAULT 0,
    "status" "EscrowStatus" NOT NULL DEFAULT 'CREATED',
    "release_deadline" TIMESTAMPTZ,
    "funded_tx_hash" VARCHAR(255),
    "release_tx_hash" VARCHAR(255),
    "refund_tx_hash" VARCHAR(255),
    "funded_at" TIMESTAMPTZ,
    "released_at" TIMESTAMPTZ,
    "refunded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "escrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL,
    "escrow_id" UUID NOT NULL,
    "on_chain_milestone_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(30,7) NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMPTZ,
    "approved_at" TIMESTAMPTZ,
    "released_at" TIMESTAMPTZ,
    "release_tx_hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "escrow_id" UUID NOT NULL,
    "opened_by_user_id" UUID NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_note" TEXT,
    "merchant_amount" DECIMAL(30,7),
    "customer_amount" DECIMAL(30,7),
    "resolution_tx_hash" VARCHAR(255),
    "resolved_by_user_id" UUID,
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_deployments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "version" VARCHAR(255) NOT NULL,
    "network" "WalletNetwork" NOT NULL,
    "wasm_hash" VARCHAR(255) NOT NULL,
    "contract_id" VARCHAR(255) NOT NULL,
    "deployer_public_key" VARCHAR(255) NOT NULL,
    "deployment_tx_hash" VARCHAR(255) NOT NULL,
    "initialization_tx_hash" VARCHAR(255),
    "deployed_at" TIMESTAMPTZ NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contract_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_events" (
    "id" UUID NOT NULL,
    "contract_id" VARCHAR(255) NOT NULL,
    "transaction_hash" VARCHAR(255) NOT NULL,
    "ledger" BIGINT NOT NULL,
    "event_index" INTEGER NOT NULL,
    "event_type" VARCHAR(255) NOT NULL,
    "topics" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "invoice_id" UUID,
    "escrow_id" UUID,
    "processed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "endpoint_id" UUID NOT NULL,
    "event_type" VARCHAR(255) NOT NULL,
    "event_id" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "response_status" INTEGER,
    "response_body" TEXT,
    "next_retry_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "merchant_id" UUID,
    "action" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(255) NOT NULL,
    "entity_id" VARCHAR(255),
    "request_id" VARCHAR(255),
    "ip_address" VARCHAR(255),
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_nonces_nonce_key" ON "auth_nonces"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_public_key_network_key" ON "wallets"("public_key", "network");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_slug_key" ON "merchants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_members_merchant_id_user_id_key" ON "merchant_members"("merchant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_public_token_key" ON "invoices"("public_token");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_merchant_id_idx" ON "invoices"("merchant_id");

-- CreateIndex
CREATE INDEX "invoices_public_token_idx" ON "invoices"("public_token");

-- CreateIndex
CREATE INDEX "invoices_due_at_idx" ON "invoices"("due_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_hash_key" ON "payments"("transaction_hash");

-- CreateIndex
CREATE INDEX "payments_transaction_hash_idx" ON "payments"("transaction_hash");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_transactions_transaction_hash_key" ON "blockchain_transactions"("transaction_hash");

-- CreateIndex
CREATE INDEX "blockchain_transactions_status_idx" ON "blockchain_transactions"("status");

-- CreateIndex
CREATE INDEX "blockchain_transactions_transaction_hash_idx" ON "blockchain_transactions"("transaction_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_transaction_hash_key" ON "refunds"("transaction_hash");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_invoice_id_key" ON "escrows"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_on_chain_escrow_id_key" ON "escrows"("on_chain_escrow_id");

-- CreateIndex
CREATE INDEX "escrows_on_chain_escrow_id_idx" ON "escrows"("on_chain_escrow_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_deployments_contract_id_key" ON "contract_deployments"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_deployments_deployment_tx_hash_key" ON "contract_deployments"("deployment_tx_hash");

-- CreateIndex
CREATE INDEX "contract_events_ledger_contract_id_idx" ON "contract_events"("ledger", "contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_events_transaction_hash_event_index_key" ON "contract_events"("transaction_hash", "event_index");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_next_retry_at_idx" ON "webhook_deliveries"("status", "next_retry_at");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_default_wallet_id_fkey" FOREIGN KEY ("default_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_members" ADD CONSTRAINT "merchant_members_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_members" ADD CONSTRAINT "merchant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "supported_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "supported_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_escrow_id_fkey" FOREIGN KEY ("escrow_id") REFERENCES "escrows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "supported_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_escrow_id_fkey" FOREIGN KEY ("escrow_id") REFERENCES "escrows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_escrow_id_fkey" FOREIGN KEY ("escrow_id") REFERENCES "escrows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
