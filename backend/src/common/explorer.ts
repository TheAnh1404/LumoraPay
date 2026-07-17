export type StellarNetwork = 'TESTNET' | 'MAINNET';

export function getExplorerBaseUrl(
  network: StellarNetwork,
  configuredBaseUrl?: string,
) {
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  return network === 'TESTNET'
    ? 'https://stellar.expert/explorer/testnet'
    : 'https://stellar.expert/explorer/public';
}

export function getTransactionExplorerUrl(
  network: StellarNetwork,
  txHash: string,
  configuredBaseUrl?: string,
) {
  if (!txHash) {
    return null;
  }
  return `${getExplorerBaseUrl(network, configuredBaseUrl)}/tx/${txHash}`;
}

export function getAccountExplorerUrl(
  network: StellarNetwork,
  publicKey: string,
  configuredBaseUrl?: string,
) {
  if (!publicKey) {
    return null;
  }
  return `${getExplorerBaseUrl(network, configuredBaseUrl)}/account/${publicKey}`;
}

export function getContractExplorerUrl(
  network: StellarNetwork,
  contractId: string,
  configuredBaseUrl?: string,
) {
  if (!contractId) {
    return null;
  }
  return `${getExplorerBaseUrl(network, configuredBaseUrl)}/contract/${contractId}`;
}

export function getLedgerExplorerUrl(
  network: StellarNetwork,
  ledger: number | bigint,
  configuredBaseUrl?: string,
) {
  if (!ledger) {
    return null;
  }
  return `${getExplorerBaseUrl(network, configuredBaseUrl)}/ledger/${ledger.toString()}`;
}
