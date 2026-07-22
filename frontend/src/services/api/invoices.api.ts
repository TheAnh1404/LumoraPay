import { apiClient } from './api-client';
import type { CreateInvoiceRequest, InvoiceDto } from '../../types/api.types';

export const invoicesApi = {
  list: () => apiClient.get<InvoiceDto[]>('/invoices'),
  create: (body: CreateInvoiceRequest) => apiClient.post<InvoiceDto>('/invoices', body),
  get: (id: string) => apiClient.get<InvoiceDto>(`/invoices/${id}`),
  update: (id: string, body: Partial<CreateInvoiceRequest>) => apiClient.patch<InvoiceDto>(`/invoices/${id}`, body),
  open: (id: string) => apiClient.post<InvoiceDto>(`/invoices/${id}/open`),
  cancel: (id: string) => apiClient.post<InvoiceDto>(`/invoices/${id}/cancel`),
  duplicate: (id: string) => apiClient.post<InvoiceDto>(`/invoices/${id}/duplicate`),
  prepareOnChain: (id: string, sourceWallet?: string) =>
    apiClient.post<{
      invoiceId: string;
      contractId: string;
      onChainInvoiceId: string;
      unsignedXdr: string;
      network: string;
      networkPassphrase: string;
      expiresAt: string;
    }>(`/invoices/${id}/prepare-onchain`, { sourceWallet }),
  submitOnChain: (id: string, signedXdr: string, sourceWallet: string) =>
    apiClient.post<{
      invoiceId: string;
      onChainInvoiceId: string;
      transactionHash: string;
      explorerUrl: string;
    }>(`/invoices/${id}/submit-onchain`, { signedXdr, sourceWallet }),
  getOnChainState: (id: string) =>
    apiClient.get<{
      db: InvoiceDto;
      contract: { contractId: string; onChainInvoiceId: string; record: any };
    }>(`/invoices/${id}/onchain-state`),
  publicByToken: (publicToken: string) => apiClient.get<InvoiceDto>(`/public/invoices/${publicToken}`, { auth: false }),
};
