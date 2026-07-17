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
  | 'DISPUTED';

export type PaymentStatus =
  | 'CREATED'
  | 'AWAITING_SIGNATURE'
  | 'SIGNED'
  | 'SUBMITTED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED';

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
