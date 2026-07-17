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
  publicByToken: (publicToken: string) => apiClient.get<InvoiceDto>(`/public/invoices/${publicToken}`, { auth: false }),
};
