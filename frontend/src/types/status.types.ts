export type InvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'DISPUTED'
  | 'FAILED';

export type PaymentStatus =
  | 'CREATED'
  | 'AWAITING_SIGNATURE'
  | 'SIGNED'
  | 'SUBMITTED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REVERSED';

export type TransactionStatus =
  | 'BUILT'
  | 'AWAITING_SIGNATURE'
  | 'SIGNED'
  | 'SUBMITTED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'NOT_FOUND';

export type EscrowStatus =
  | 'CREATED'
  | 'FUNDED'
  | 'ACTIVE'
  | 'RELEASE_PENDING'
  | 'RELEASED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'EXPIRED'
  | 'CANCELLED';

export type WalletNetwork = 'TESTNET' | 'MAINNET';

export const paymentProgressLabels: Record<PaymentStatus, string> = {
  CREATED: 'Preparing transaction',
  AWAITING_SIGNATURE: 'Waiting for Freighter',
  SIGNED: 'Signature received',
  SUBMITTED: 'Submitted to Stellar',
  PENDING: 'Confirming on Stellar',
  CONFIRMED: 'Payment successful',
  FAILED: 'Payment failed',
  EXPIRED: 'Transaction expired',
  REVERSED: 'Payment reversed',
};
