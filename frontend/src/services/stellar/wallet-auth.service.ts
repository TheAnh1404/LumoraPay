import { authApi } from '../api/auth.api';
import { freighterService, getConfiguredStellarNetwork } from './freighter.service';

export const walletAuthService = {
  async authenticateWithWallet() {
    const expectedNetwork = getConfiguredStellarNetwork();
    const walletAddress = await freighterService.requestAccess();
    await freighterService.validateExpectedNetwork();
    const challenge = await authApi.challenge(walletAddress, expectedNetwork.network);
    const signedChallenge = await freighterService.signAuthMessage(challenge.message, walletAddress);
    const verified = await authApi.verify(
      walletAddress,
      challenge.nonce,
      signedChallenge.signature,
      signedChallenge.signerAddress,
    );
    localStorage.setItem('lumora_access_token', verified.accessToken);

    return {
      walletAddress,
      user: verified.user,
      merchant: verified.merchant ?? null,
    };
  },
};
