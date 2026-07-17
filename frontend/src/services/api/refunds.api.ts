import { apiClient } from './api-client';

export interface RefundPrepareResponse {
  id: string;
  unsignedXdr: string;
  networkPassphrase: string;
  amount: string;
  destination: string;
}

export const refundsApi = {
  prepare: (paymentId: string, body: { amount: string; reason: string }) =>
    apiClient.post<RefundPrepareResponse>(`/payments/${paymentId}/refunds/prepare`, body),
  submit: (refundId: string, signedXdr: string) =>
    apiClient.post<{ id: string; transactionHash: string; explorerUrl?: string | null }>(`/refunds/${refundId}/submit`, {
      signedXdr,
    }),
  get: (refundId: string) => apiClient.get<{ id: string; status: string }>(`/refunds/${refundId}`),
};
