import { create } from 'zustand';
import { walletService } from '../services/wallet.service';
import { walletAuthService } from '../services/stellar/wallet-auth.service';
import { stellarApi } from '../services/api/stellar.api';
import { authApi } from '../services/api/auth.api';
import { hasAccessToken } from '../services/api/api-client';
import { getConfiguredStellarNetwork } from '../services/stellar/freighter.service';
import { analyticsService } from '../services/analytics.service';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'wrong_network' | 'error';

let connectPromise: Promise<string | null> | null = null;
let restorePromise: Promise<string | null> | null = null;

const WALLET_SESSION_KEY = 'lumora_wallet_session';

interface PersistedWalletSession {
  address: string;
  network: string;
  connectedAt: string;
}

function readWalletSession(): PersistedWalletSession | null {
  try {
    const raw = localStorage.getItem(WALLET_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedWalletSession>;
    if (!parsed.address || !parsed.network) return null;
    return {
      address: parsed.address,
      network: parsed.network,
      connectedAt: parsed.connectedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeWalletSession(session: PersistedWalletSession) {
  localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(session));
}

function clearWalletSession() {
  localStorage.removeItem(WALLET_SESSION_KEY);
}

function networkLabel(network: string) {
  if (network === 'TESTNET') return 'Stellar Testnet';
  if (network === 'PUBLIC' || network === 'MAINNET') return 'Stellar Mainnet';
  return network || 'Unknown network';
}

function normalizeWalletError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : 'Wallet connection failed';
  const message = rawMessage.trim() || 'Wallet connection failed';
  const lower = message.toLowerCase();

  if (lower.includes('invalid signature') || lower.includes('signature verification')) {
    return 'Freighter signature could not be verified. Unlock the same account, approve the sign-in message, and try again.';
  }

  if (lower.includes('wrong freighter network')) {
    return message;
  }

  if (lower.includes('not installed')) {
    return 'Freighter is not installed. Install the browser extension, then connect again.';
  }

  if (lower.includes('timed out')) {
    return 'Freighter did not respond in time. Unlock the extension and try again.';
  }

  if (lower.includes('user declined') || lower.includes('rejected')) {
    return 'Freighter request was rejected. Approve the wallet request to continue.';
  }

  return message;
}

interface WalletState {
  status: WalletStatus;
  address: string | null;
  network: string;
  balance: string;
  isInstalled: boolean;
  error: string | null;
  connect: () => Promise<string | null>;
  restoreConnection: () => Promise<string | null>;
  disconnect: () => void;
  setNetwork: (network: string) => void;
  setBalance: (balance: string) => void;
  requestFaucet: () => Promise<boolean>;
  checkInstallation: () => Promise<boolean>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  status: 'disconnected',
  address: null,
  network: 'Stellar Testnet',
  balance: '0.00000',
  isInstalled: false,
  error: null,

  checkInstallation: async () => {
    try {
      const installed = await walletService.isInstalled();
      set({ isInstalled: installed });
      return installed;
    } catch {
      set({ isInstalled: false });
      return false;
    }
  },

  connect: async () => {
    const current = get();
    if (current.status === 'connected' && current.address) {
      return current.address;
    }

    if (connectPromise) {
      return connectPromise;
    }

    connectPromise = (async () => {
      set({ status: 'connecting', error: null });
      try {
        const result = await walletAuthService.authenticateWithWallet();
        const freighterNetwork = await walletService.getNetwork();
        const detectedNetworkLabel = networkLabel(freighterNetwork);
        const expectedNetwork = getConfiguredStellarNetwork();
        let balance = '0.00000';
        let balanceError: string | null = null;

        try {
          balance = await walletService.getBalance(result.walletAddress);
        } catch (e) {
          balanceError = e instanceof Error ? e.message : 'Unable to load wallet balance from Horizon';
        }

        set({
          status: detectedNetworkLabel === expectedNetwork.label ? 'connected' : 'wrong_network',
          address: result.walletAddress,
          network: detectedNetworkLabel,
          balance,
          isInstalled: true,
          error: balanceError,
        });
        writeWalletSession({
          address: result.walletAddress,
          network: detectedNetworkLabel,
          connectedAt: new Date().toISOString(),
        });
        analyticsService.trackWalletInteraction('CONNECT', {
          walletAddress: result.walletAddress,
          network: detectedNetworkLabel,
          metadata: {
            balanceLoaded: !balanceError,
            status:
              detectedNetworkLabel === expectedNetwork.label ? 'connected' : 'wrong_network',
          },
        });
        return result.walletAddress;
      } catch (e) {
        const message = normalizeWalletError(e);
        set({ status: message.toLowerCase().includes('network') ? 'wrong_network' : 'error', error: message });
        return null;
      } finally {
        connectPromise = null;
      }
    })();

    return connectPromise;
  },

  restoreConnection: async () => {
    const current = get();
    if (current.status === 'connected' && current.address) {
      return current.address;
    }

    if (restorePromise) {
      return restorePromise;
    }

    restorePromise = (async () => {
      const session = readWalletSession();
      if (!hasAccessToken()) {
        clearWalletSession();
        set({ status: 'disconnected', address: null, balance: '0.00000', error: null });
        return null;
      }

      set({ status: 'connecting', error: null });
      try {
        const installed = await walletService.isInstalled();
        if (!installed) {
          clearWalletSession();
          set({
            status: 'disconnected',
            address: null,
            balance: '0.00000',
            isInstalled: false,
            error: 'Freighter is not installed. Install the browser extension, then connect again.',
          });
          return null;
        }

        const [currentAddress, freighterNetwork, me] = await Promise.all([
          walletService.getAddress(),
          walletService.getNetwork(),
          authApi.me(),
        ]);

        if (!currentAddress) {
          clearWalletSession();
          set({
            status: 'disconnected',
            address: null,
            balance: '0.00000',
            isInstalled: true,
            error: null,
          });
          return null;
        }

        const knownWallets = me.wallets || [];
        const isKnownWallet = knownWallets.some((wallet) => wallet.publicKey === currentAddress);
        if ((session && currentAddress !== session.address) || !isKnownWallet) {
          clearWalletSession();
          localStorage.removeItem('lumora_access_token');
          set({
            status: 'disconnected',
            address: null,
            balance: '0.00000',
            isInstalled: true,
            error: 'Freighter account changed. Connect again with the active wallet.',
          });
          return null;
        }

        const detectedNetworkLabel = networkLabel(freighterNetwork);
        const expectedNetwork = getConfiguredStellarNetwork();
        let balance = '0.00000';
        let balanceError: string | null = null;
        try {
          balance = await walletService.getBalance(currentAddress);
        } catch (e) {
          balanceError = e instanceof Error ? e.message : 'Unable to load wallet balance from Horizon';
        }

        const restoredStatus = detectedNetworkLabel === expectedNetwork.label ? 'connected' : 'wrong_network';
        set({
          status: restoredStatus,
          address: currentAddress,
          network: detectedNetworkLabel,
          balance,
          isInstalled: true,
          error:
            restoredStatus === 'wrong_network'
              ? `Wrong Freighter network. Switch Freighter to ${expectedNetwork.label}.`
              : balanceError,
        });
        writeWalletSession({
          address: currentAddress,
          network: detectedNetworkLabel,
          connectedAt: session?.connectedAt || new Date().toISOString(),
        });
        analyticsService.trackWalletInteraction('RESTORE', {
          walletAddress: currentAddress,
          network: detectedNetworkLabel,
          metadata: {
            balanceLoaded: !balanceError,
            status: restoredStatus,
          },
        });
        return currentAddress;
      } catch (e) {
        const message = normalizeWalletError(e);
        const tokenStillPresent = hasAccessToken();
        if (!tokenStillPresent) {
          clearWalletSession();
        }
        if (message.toLowerCase().includes('connect freighter') || message.toLowerCase().includes('session')) {
          clearWalletSession();
          localStorage.removeItem('lumora_access_token');
        }
        set({
          status: 'disconnected',
          address: null,
          balance: '0.00000',
          error: message,
        });
        return null;
      } finally {
        restorePromise = null;
      }
    })();

    return restorePromise;
  },

  disconnect: () => {
    const { address, network } = get();
    if (address && hasAccessToken()) {
      analyticsService.trackWalletInteraction('DISCONNECT', {
        walletAddress: address,
        network,
      });
    }
    localStorage.removeItem('lumora_access_token');
    clearWalletSession();
    set({
      status: 'disconnected',
      address: null,
      balance: '0.00000',
      error: null,
    });
  },

  setNetwork: (network: string) => {
    set({
      network,
      status: network !== 'Stellar Testnet' && get().status === 'connected' ? 'wrong_network' : get().status,
    });
  },

  setBalance: (balance: string) => {
    set({ balance });
  },

  requestFaucet: async () => {
    const address = get().address;
    if (!address) return false;

    try {
      const result = await stellarApi.faucet(address);
      if (!result.success) {
        return false;
      }
      set({ balance: parseFloat(result.balance).toFixed(5) });
      analyticsService.trackWalletInteraction('FAUCET_REQUEST', {
        walletAddress: address,
        network: get().network,
        transactionHash: result.transactionHash || undefined,
        metadata: { balance: result.balance },
      });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Faucet request failed' });
      return false;
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('lumora:auth-expired', () => {
    clearWalletSession();
    useWalletStore.setState({
      status: 'disconnected',
      address: null,
      balance: '0.00000',
      error: 'Session expired. Connect Freighter again.',
    });
  });
}

export default useWalletStore;
