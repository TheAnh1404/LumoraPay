import { apiClient } from './api-client';
import type { PaymentDto, PaymentIntentDto, PaymentStatusDto, ReceiptDto } from '../../types/api.types';

export const paymentsApi = {
  list: () => apiClient.get<PaymentDto[]>('/payments'),
  get: (id: string) => apiClient.get<PaymentDto>(`/payments/${id}`),
  byHash: (transactionHash: string) => apiClient.get<PaymentDto>(`/payments/hash/${transactionHash}`),
  receipt: (id: string) => apiClient.get<ReceiptDto>(`/payments/${id}/receipt`),
  createIntent: (publicToken: string, payerWallet: string) =>
    apiClient.post<PaymentIntentDto>(
      `/public/invoices/${publicToken}/payment-intents`,
      { payerWallet },
      { auth: false },
    ),
  submitIntent: (paymentIntentId: string, signedXdr: string, payerWallet: string) =>
    apiClient.post<PaymentDto>(
      `/payment-intents/${paymentIntentId}/submit`,
      { signedXdr, payerWallet },
      { auth: false, timeoutMs: 60000 },
    ),
  intentStatus: (paymentIntentId: string) =>
    apiClient.get<PaymentStatusDto>(`/payment-intents/${paymentIntentId}/status`, { auth: false }),
  requestFaucet: (address: string) =>
    apiClient.post<{ success: boolean; address: string; balance: string; transactionHash?: string }>(
      '/payments/faucet',
      { address },
      { auth: false },
    ),
};
