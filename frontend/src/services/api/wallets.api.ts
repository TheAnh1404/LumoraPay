import { apiClient } from './api-client';
import type { WalletBalanceDto, WalletTransactionDto } from '../../types/api.types';

export const walletsApi = {
  balance: (address: string) => apiClient.get<WalletBalanceDto>(`/wallets/${address}/balance`, { auth: false }),
  transactions: (address: string) => apiClient.get<WalletTransactionDto[]>(`/wallets/${address}/transactions`),
};
