import { apiClient } from './api-client';
import type { CustomerDto } from '../../types/api.types';

export interface CustomerRequest {
  name: string;
  email?: string;
  walletAddress?: string;
  notes?: string;
}

export const customersApi = {
  list: () => apiClient.get<CustomerDto[]>('/customers'),
  create: (body: CustomerRequest) => apiClient.post<CustomerDto>('/customers', body),
  get: (id: string) => apiClient.get<CustomerDto>(`/customers/${id}`),
  update: (id: string, body: Partial<CustomerRequest>) => apiClient.patch<CustomerDto>(`/customers/${id}`, body),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/customers/${id}`),
};
