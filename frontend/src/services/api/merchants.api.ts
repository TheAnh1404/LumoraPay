import { apiClient } from './api-client';
import type { DashboardStatsDto, MerchantDto } from '../../types/api.types';

export interface CreateMerchantRequest {
  businessName: string;
  slug: string;
  supportEmail?: string;
  defaultWalletAddress: string;
}

export const merchantsApi = {
  current: () => apiClient.get<MerchantDto>('/merchants/current'),
  dashboard: () => apiClient.get<DashboardStatsDto>('/merchants/current/dashboard'),
  create: (body: CreateMerchantRequest) => apiClient.post<MerchantDto>('/merchants', body),
  updateCurrent: (body: Partial<CreateMerchantRequest>) => apiClient.patch<MerchantDto>('/merchants/current', body),
};
