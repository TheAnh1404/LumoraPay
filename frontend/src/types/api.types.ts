import type { EscrowStatus, InvoiceStatus, PaymentStatus, TransactionStatus, WalletNetwork } from './status.types';
export type { WalletNetwork } from './status.types';

export interface ApiError {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface UserDto {
  id: string;
  email?: string | null;
  displayName: string;
  wallets?: WalletDto[];
}

export interface WalletDto {
  id?: string;
  publicKey: string;
  network: WalletNetwork;
  label?: string | null;
  isPrimary?: boolean;
}

export interface MerchantDto {
  id: string;
  businessName: string;
  slug: string;
  supportEmail?: string | null;
  defaultWallet?: WalletDto;
  defaultWalletId?: string;
}

export interface DashboardStatsDto {
  totalReceived: string;
  asset: string;
  paidInvoices: number;
  openInvoices: number;
  paymentSuccessRate: number;
  revenueHistory: { date: string; amount: number }[];
  recentInvoices?: InvoiceDto[];
  recentPayments?: PaymentDto[];
  walletBalance?: string;
}

export interface CustomerDto {
  id: string;
  name: string;
  email: string;
  wallet: string;
  walletAddress?: string | null;
  invoicesCount: number;
  totalPaid: string;
  status: string;
  createdAt: string;
  notes?: string;
  invoices?: InvoiceDto[];
  payments?: PaymentDto[];
}

export interface InvoiceItemDto {
  id?: string;
  name?: string;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice?: string;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  publicToken?: string;
  title: string;
  description: string;
  amount: string;
  asset: string;
  dueDate: string;
  memo: string;
  status: InvoiceStatus;
  customerName: string;
  customerEmail: string;
  customerWallet: string;
  destinationWallet: string;
  createdAt: string;
  paidAt?: string | null;
  paymentType?: 'DIRECT' | 'ESCROW' | 'MILESTONE';
  merchantName?: string;
  items: InvoiceItemDto[];
  payments?: PaymentDto[];
  escrow?: EscrowDto | null;
  checkoutUrl?: string;
}

export interface CreateInvoiceRequest {
  customerId?: string;
  customer?: {
    name: string;
    email?: string;
    walletAddress?: string;
  };
  title: string;
  description?: string;
  asset?: string;
  dueDate?: string;
  memo?: string;
  paymentType?: 'DIRECT' | 'ESCROW';
  destinationWallet?: string;
  items: { description: string; quantity: number; unitPrice: string }[];
  open?: boolean;
}

export interface PaymentDto {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  amount: string;
  asset: string;
  fromWallet: string;
  toWallet: string;
  hash: string;
  ledger: number;
  fee: string;
  timestamp: string;
  status: PaymentStatus;
  explorerUrl?: string | null;
  receiptUrl?: string;
}

export interface PaymentIntentDto {
  id: string;
  paymentId: string;
  invoiceId: string;
  unsignedXdr: string;
  network: WalletNetwork;
  networkPassphrase: string;
  amount: string;
  asset: string;
  destination: string;
  memo: string;
  expiresAt: string;
}

export interface PaymentStatusDto {
  id: string;
  paymentId: string;
  status: PaymentStatus;
  transactionStatus?: TransactionStatus;
  transactionHash?: string | null;
  explorerUrl?: string | null;
  payment?: PaymentDto;
}

export interface EscrowDto {
  id: string;
  invoiceId?: string;
  invoiceNumber?: string;
  contractId: string;
  onChainEscrowId: string;
  payerWallet: string;
  merchantWallet: string;
  amount: string;
  asset?: string;
  platformFee?: string;
  status: EscrowStatus;
  releaseDeadline?: string | null;
  fundedTxHash?: string | null;
  releaseTxHash?: string | null;
  refundTxHash?: string | null;
  fundedAt?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  transactions?: {
    id: string;
    kind: string;
    status: TransactionStatus;
    sourceAccount: string;
    transactionHash?: string | null;
    ledger?: number | null;
    createdAt: string;
  }[];
}

export interface EscrowCreateIntentDto {
  id: string;
  escrowId: string;
  invoiceId: string;
  blockchainTxId?: string;
  needsCreate: boolean;
  unsignedXdr?: string;
  network: WalletNetwork;
  networkPassphrase: string;
  contractId: string;
  onChainEscrowId: string;
  amount: string;
  asset: string;
  expiresAt?: string;
}

export interface EscrowTransactionResultDto {
  escrowId: string;
  status?: EscrowStatus;
  transactionHash: string;
  explorerUrl?: string | null;
}

export interface EscrowDepositIntentDto {
  id: string;
  paymentId: string;
  escrowId: string;
  blockchainTxId: string;
  unsignedXdr: string;
  network: WalletNetwork;
  networkPassphrase: string;
  amount: string;
  asset: string;
  contractId: string;
  expiresAt: string;
}

export interface ReceiptDto {
  payment: PaymentDto;
  invoice?: InvoiceDto;
  network: WalletNetwork;
  sourceAccount: string;
  destination: string;
  memo?: string | null;
  ledgerClosedAt?: string | null;
  explorerUrl?: string | null;
}

export interface WalletBalanceDto {
  address: string;
  network: WalletNetwork;
  nativeBalance: string;
  balances: { asset: string; balance: string; issuer?: string }[];
}

export interface WalletTransactionDto {
  id: string;
  hash: string;
  type: string;
  amount?: string;
  asset?: string;
  fromWallet?: string;
  toWallet?: string;
  fee?: string;
  ledger?: number;
  timestamp?: string;
  status: string;
  explorerUrl?: string | null;
}

export type WalletInteractionType =
  | 'CONNECT'
  | 'RESTORE'
  | 'DISCONNECT'
  | 'NETWORK_CHECK'
  | 'BALANCE_CHECK'
  | 'FAUCET_REQUEST'
  | 'PAYMENT_XDR_SIGNED'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_CONFIRMED'
  | 'REFUND_XDR_SIGNED'
  | 'SOROBAN_XDR_SIGNED'
  | 'ESCROW_ACTION_SUBMITTED';

export type FeedbackCategory =
  | 'GENERAL'
  | 'UX'
  | 'BUG'
  | 'PAYMENT'
  | 'WALLET'
  | 'ESCROW'
  | 'DOCUMENTATION';

export interface PilotEventRequest {
  eventName: string;
  route?: string;
  sessionId?: string;
  walletAddress?: string;
  properties?: Record<string, unknown>;
}

export interface WalletInteractionRequest {
  interactionType: WalletInteractionType;
  walletAddress?: string;
  network?: string;
  route?: string;
  entityType?: string;
  entityId?: string;
  transactionHash?: string;
  metadata?: Record<string, unknown>;
}

export interface ProductFeedbackRequest {
  category?: FeedbackCategory;
  rating: number;
  message: string;
  contactConsent?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PilotOverviewDto {
  level4Targets: {
    minimumRealUsers: number;
    minimumMeaningfulCommits: number;
    smartContractsDeployed: boolean;
  };
  totals: {
    users: number;
    verifiedWallets: number;
    uniqueInteractedWallets: number;
    walletInteractions: number;
    feedbackResponses: number;
    productEvents: number;
  };
  currentMerchant: {
    merchantId?: string | null;
    walletInteractions: number;
    feedbackResponses: number;
  };
  readiness: {
    usersOnboarded: boolean;
    walletProofCaptured: boolean;
    feedbackCollected: boolean;
    contractsConfigured: boolean;
  };
}
