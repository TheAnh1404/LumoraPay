import { apiClient } from './api-client';

export interface ContractConfigDto {
  network: string;
  rpcUrl: string;
  invoiceRegistryContractId?: string;
  paymentEscrowContractId?: string;
  invoiceRegistryConfigured: boolean;
  paymentEscrowConfigured: boolean;
}

export const contractsApi = {
  config: () => apiClient.get<ContractConfigDto>('/contracts/config', { auth: false }),
};
