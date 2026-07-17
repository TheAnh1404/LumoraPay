import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  signMessage,
  signTransaction,
} from '@stellar/freighter-api';
import type { WalletNetwork } from '../../types/status.types';

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
const MAINNET_PASSPHRASE = 'Public Global Stellar Network ; September 2015';
const configuredNetwork = (import.meta.env.VITE_STELLAR_NETWORK || 'TESTNET') as WalletNetwork;
const configuredPassphrase =
  import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE ||
  (configuredNetwork === 'MAINNET' ? MAINNET_PASSPHRASE : TESTNET_PASSPHRASE);

export function getConfiguredStellarNetwork() {
  return {
    network: configuredNetwork,
    networkPassphrase: configuredPassphrase,
    label: configuredNetwork === 'MAINNET' ? 'Stellar Mainnet' : 'Stellar Testnet',
  };
}

function errorMessage(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return 'Freighter request failed';
}

function normalizeSignedMessage(signedMessage: string | Uint8Array | null) {
  if (!signedMessage) {
    throw new Error('Freighter returned an empty message signature');
  }

  if (typeof signedMessage === 'string') {
    const normalized = signedMessage.trim();
    if (!normalized) {
      throw new Error('Freighter returned an empty message signature');
    }
    return normalized;
  }

  return Array.from(signedMessage)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function withTimeout<T>(operation: Promise<T>, label: string, timeoutMs = 30000) {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Unlock Freighter and approve the request.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export class FreighterService {
  async isInstalled() {
    try {
      const result = await withTimeout(isConnected(), 'Freighter connection check', 5000);
      return Boolean(result.isConnected);
    } catch {
      return false;
    }
  }

  async requestAccess() {
    const installed = await this.isInstalled();
    if (!installed) {
      throw new Error('Freighter wallet is not installed');
    }

    const result = await withTimeout(requestAccess(), 'Freighter access request');
    if (result.error) {
      throw new Error(errorMessage(result.error));
    }

    if (!result.address) {
      throw new Error('Freighter did not return a wallet address. Unlock the wallet and try again.');
    }

    return result.address;
  }

  async getPublicKey() {
    const result = await withTimeout(getAddress(), 'Freighter address request', 10000);
    if (result.error) {
      throw new Error(errorMessage(result.error));
    }
    return result.address;
  }

  async getNetwork() {
    const result = await withTimeout(getNetwork(), 'Freighter network request', 10000);
    if (result.error) {
      throw new Error(errorMessage(result.error));
    }
    return {
      network: result.network,
      networkPassphrase: result.networkPassphrase,
    };
  }

  async validateExpectedNetwork() {
    const network = await this.getNetwork();
    if (network.networkPassphrase !== configuredPassphrase) {
      const target = configuredNetwork === 'MAINNET' ? 'Stellar Mainnet' : 'Stellar Testnet';
      throw new Error(`Wrong Freighter network. Switch Freighter to ${target}.`);
    }
    return network;
  }

  async signAuthMessage(message: string, address: string) {
    await this.validateExpectedNetwork();
    const result = await withTimeout(signMessage(message, {
      address,
      networkPassphrase: configuredPassphrase,
    }), 'Freighter message signature');
    if (result.error) {
      throw new Error(errorMessage(result.error));
    }

    if (result.signerAddress && result.signerAddress !== address) {
      throw new Error('Freighter signed with a different wallet. Switch to the connected account and try again.');
    }

    return {
      signature: normalizeSignedMessage(result.signedMessage),
      signerAddress: result.signerAddress || address,
    };
  }

  async signClassicTransaction(xdr: string, address?: string) {
    await this.validateExpectedNetwork();
    const result = await withTimeout(signTransaction(xdr, {
      address,
      networkPassphrase: configuredPassphrase,
    }), 'Freighter transaction signature');
    if (result.error) {
      throw new Error(errorMessage(result.error));
    }

    if (!result.signedTxXdr) {
      throw new Error('Freighter returned an empty signed transaction.');
    }

    return result.signedTxXdr;
  }

  async signSorobanTransaction(xdr: string, address?: string) {
    return this.signClassicTransaction(xdr, address);
  }
}

export const freighterService = new FreighterService();
