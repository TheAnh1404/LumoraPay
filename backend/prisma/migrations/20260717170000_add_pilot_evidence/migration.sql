-- CreateEnum
CREATE TYPE "WalletInteractionType" AS ENUM (
  'CONNECT',
  'RESTORE',
  'DISCONNECT',
  'NETWORK_CHECK',
  'BALANCE_CHECK',
  'FAUCET_REQUEST',
  'PAYMENT_XDR_SIGNED',
  'PAYMENT_SUBMITTED',
  'PAYMENT_CONFIRMED',
  'REFUND_XDR_SIGNED',
  'SOROBAN_XDR_SIGNED',
  'ESCROW_ACTION_SUBMITTED'
);

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM (
  'GENERAL',
  'UX',
  'BUG',
  'PAYMENT',
  'WALLET',
  'ESCROW',
  'DOCUMENTATION'
);

-- CreateTable
CREATE TABLE "wallet_interactions" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "merchant_id" UUID,
  "wallet_address" VARCHAR(255) NOT NULL,
  "network" "WalletNetwork" NOT NULL,
  "interaction_type" "WalletInteractionType" NOT NULL,
  "route" VARCHAR(255),
  "entity_type" VARCHAR(80),
  "entity_id" VARCHAR(255),
  "transaction_hash" VARCHAR(255),
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wallet_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_feedback" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "merchant_id" UUID,
  "wallet_address" VARCHAR(255),
  "category" "FeedbackCategory" NOT NULL DEFAULT 'GENERAL',
  "rating" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "contact_consent" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_events" (
  "id" UUID NOT NULL,
  "user_id" UUID,
  "merchant_id" UUID,
  "session_id" VARCHAR(255),
  "event_name" VARCHAR(120) NOT NULL,
  "route" VARCHAR(255),
  "wallet_address" VARCHAR(255),
  "properties" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_interactions_wallet_address_created_at_idx" ON "wallet_interactions"("wallet_address", "created_at");

-- CreateIndex
CREATE INDEX "wallet_interactions_user_id_created_at_idx" ON "wallet_interactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_interactions_merchant_id_created_at_idx" ON "wallet_interactions"("merchant_id", "created_at");

-- CreateIndex
CREATE INDEX "product_feedback_merchant_id_created_at_idx" ON "product_feedback"("merchant_id", "created_at");

-- CreateIndex
CREATE INDEX "product_feedback_rating_idx" ON "product_feedback"("rating");

-- CreateIndex
CREATE INDEX "product_events_event_name_created_at_idx" ON "product_events"("event_name", "created_at");

-- CreateIndex
CREATE INDEX "product_events_session_id_created_at_idx" ON "product_events"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "product_events_merchant_id_created_at_idx" ON "product_events"("merchant_id", "created_at");

-- AddForeignKey
ALTER TABLE "wallet_interactions" ADD CONSTRAINT "wallet_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_interactions" ADD CONSTRAINT "wallet_interactions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feedback" ADD CONSTRAINT "product_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_feedback" ADD CONSTRAINT "product_feedback_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
