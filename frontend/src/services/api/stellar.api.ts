import { apiClient } from './api-client';

export const stellarApi = {
  faucet: (address: string) =>
    apiClient.post<{ success: boolean; address: string; balance: string; transactionHash?: string | null }>(
      '/stellar/faucet',
      { address },
      { auth: false, timeoutMs: 60000 },
    ),
};
