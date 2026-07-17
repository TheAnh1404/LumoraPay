import { registerAs } from '@nestjs/config';

export default registerAs('stellar', () => ({
  network: process.env.STELLAR_NETWORK || 'TESTNET',
  networkPassphrase:
    process.env.STELLAR_NETWORK_PASSPHRASE ||
    'Test SDF Network ; September 2015',
  horizonUrl:
    process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  expertBaseUrl:
    process.env.STELLAR_EXPERT_BASE_URL ||
    'https://stellar.expert/explorer/testnet',
  invoiceRegistryContractId: process.env.INVOICE_REGISTRY_CONTRACT_ID || '',
  paymentEscrowContractId: process.env.PAYMENT_ESCROW_CONTRACT_ID || '',
  feeRecipient: process.env.PLATFORM_FEE_RECIPIENT || '',
  feeBps: parseInt(process.env.PLATFORM_FEE_BPS || '50', 10),
}));
