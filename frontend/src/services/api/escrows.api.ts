import { apiClient } from './api-client';
import type {
  EscrowCreateIntentDto,
  EscrowDepositIntentDto,
  EscrowDto,
  EscrowTransactionResultDto,
  PaymentDto,
} from '../../types/api.types';

export const escrowsApi = {
  get: (id: string) => apiClient.get<EscrowDto>(`/escrows/${id}`),
  onChainState: (id: string) => apiClient.get<unknown>(`/escrows/${id}/on-chain-state`),

  createIntent: (publicToken: string, payerWallet: string) =>
    apiClient.post<EscrowCreateIntentDto>(
      `/public/invoices/${publicToken}/escrow-intents`,
      { payerWallet },
      { auth: false, timeoutMs: 60000 },
    ),
  submitCreate: (escrowId: string, signedXdr: string, payerWallet: string) =>
    apiClient.post<EscrowTransactionResultDto>(
      `/public/escrow-intents/${escrowId}/submit-create`,
      { signedXdr, payerWallet },
      { auth: false, timeoutMs: 90000 },
    ),

  prepareDeposit: (id: string, payerWallet: string) =>
    apiClient.post<EscrowDepositIntentDto>(
      `/escrows/${id}/prepare-deposit`,
      { payerWallet },
      { auth: false, timeoutMs: 60000 },
    ),
  preparePublicDeposit: (escrowId: string, payerWallet: string) =>
    apiClient.post<EscrowDepositIntentDto>(
      `/public/escrow-intents/${escrowId}/prepare-deposit`,
      { payerWallet },
      { auth: false, timeoutMs: 60000 },
    ),
  submitDeposit: (
    id: string,
    signedXdr: string,
    payerWallet: string,
    paymentIntentId?: string,
  ) =>
    apiClient.post<PaymentDto>(
      `/escrows/${id}/submit-deposit`,
      { signedXdr, payerWallet, paymentIntentId },
      { auth: false, timeoutMs: 90000 },
    ),
  submitPublicDeposit: (
    escrowId: string,
    signedXdr: string,
    payerWallet: string,
    paymentIntentId?: string,
  ) =>
    apiClient.post<PaymentDto>(
      `/public/escrow-intents/${escrowId}/submit-deposit`,
      { signedXdr, payerWallet, paymentIntentId },
      { auth: false, timeoutMs: 90000 },
    ),

  prepareRelease: (id: string, sourceWallet: string) =>
    apiClient.post<EscrowDepositIntentDto>(`/escrows/${id}/prepare-release`, { sourceWallet }),
  submitRelease: (id: string, signedXdr: string, sourceWallet: string) =>
    apiClient.post<EscrowTransactionResultDto>(`/escrows/${id}/submit-release`, {
      signedXdr,
      sourceWallet,
    }),
  prepareRefund: (id: string, sourceWallet: string) =>
    apiClient.post<EscrowDepositIntentDto>(`/escrows/${id}/prepare-refund`, { sourceWallet }),
  submitRefund: (id: string, signedXdr: string, sourceWallet: string) =>
    apiClient.post<EscrowTransactionResultDto>(`/escrows/${id}/submit-refund`, {
      signedXdr,
      sourceWallet,
    }),
  prepareDispute: (
    id: string,
    sourceWallet: string,
    payload: { evidenceHash?: string; reason?: string; description?: string },
  ) =>
    apiClient.post<EscrowDepositIntentDto>(`/escrows/${id}/prepare-dispute`, {
      sourceWallet,
      ...payload,
    }),
  submitDispute: (id: string, signedXdr: string, sourceWallet: string) =>
    apiClient.post<EscrowTransactionResultDto>(`/escrows/${id}/submit-dispute`, {
      signedXdr,
      sourceWallet,
    }),
  prepareResolveDispute: (
    id: string,
    sourceWallet: string,
    merchantAmount: string,
    payerAmount: string,
  ) =>
    apiClient.post<EscrowDepositIntentDto>(`/escrows/${id}/prepare-resolve-dispute`, {
      sourceWallet,
      merchantAmount,
      payerAmount,
    }),
  submitResolveDispute: (
    id: string,
    signedXdr: string,
    sourceWallet: string,
    merchantAmount: string,
    payerAmount: string,
  ) =>
    apiClient.post<EscrowTransactionResultDto>(`/escrows/${id}/submit-resolve-dispute`, {
      signedXdr,
      sourceWallet,
      merchantAmount,
      payerAmount,
    }),
};
