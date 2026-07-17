import { apiClient } from './api-client';
import type { MerchantDto, UserDto, WalletDto, WalletNetwork } from '../../types/api.types';

export interface WalletChallengeResponse {
  nonce: string;
  message: string;
  network: WalletNetwork;
}

export interface WalletVerifyResponse {
  accessToken: string;
  user: UserDto;
  merchant?: MerchantDto | null;
}

export const authApi = {
  challenge: (walletAddress: string, network: WalletNetwork) =>
    apiClient.post<WalletChallengeResponse>('/auth/wallet/challenge', { walletAddress, network }, { auth: false }),
  verify: (walletAddress: string, nonce: string, signature: string, signerAddress?: string) =>
    apiClient.post<WalletVerifyResponse>(
      '/auth/wallet/verify',
      { walletAddress, nonce, signature, signerAddress },
      { auth: false },
    ),
  me: () => apiClient.get<{ user: UserDto; wallets: WalletDto[]; merchant?: MerchantDto | null }>('/auth/me'),
  logout: () => apiClient.post<{ success: boolean }>('/auth/logout'),
};
