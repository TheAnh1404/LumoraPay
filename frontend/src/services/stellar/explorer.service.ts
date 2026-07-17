import type { WalletNetwork } from '../../types/status.types';

const configuredBase = import.meta.env.VITE_STELLAR_EXPERT_BASE_URL as string | undefined;

export function getExplorerBaseUrl(network: WalletNetwork) {
  if (configuredBase) {
    return configuredBase.replace(/\/$/, '');
  }

  return network === 'TESTNET'
    ? 'https://stellar.expert/explorer/testnet'
    : 'https://stellar.expert/explorer/public';
}

export function getTransactionExplorerUrl(network: WalletNetwork, txHash: string) {
  if (!txHash) {
    return null;
  }
  return `${getExplorerBaseUrl(network)}/tx/${txHash}`;
}

export function getAccountExplorerUrl(network: WalletNetwork, publicKey: string) {
  if (!publicKey) {
    return null;
  }
  return `${getExplorerBaseUrl(network)}/account/${publicKey}`;
}

export function getContractExplorerUrl(network: WalletNetwork, contractId: string) {
  if (!contractId) {
    return null;
  }
  return `${getExplorerBaseUrl(network)}/contract/${contractId}`;
}

export function getLedgerExplorerUrl(network: WalletNetwork, ledger: number | string) {
  if (!ledger) {
    return null;
  }
  return `${getExplorerBaseUrl(network)}/ledger/${ledger}`;
}
