type Env = Record<string, string | undefined>;

const REQUIRED_IN_ALL_ENVIRONMENTS = ['DATABASE_URL'] as const;

export function validateEnv(config: Env) {
  for (const key of REQUIRED_IN_ALL_ENVIRONMENTS) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const network = config.STELLAR_NETWORK || 'TESTNET';
  if (!['TESTNET', 'MAINNET'].includes(network)) {
    throw new Error('STELLAR_NETWORK must be TESTNET or MAINNET');
  }

  if (!config.STELLAR_NETWORK_PASSPHRASE) {
    config.STELLAR_NETWORK_PASSPHRASE =
      network === 'TESTNET'
        ? 'Test SDF Network ; September 2015'
        : 'Public Global Stellar Network ; September 2015';
  }

  if (!config.STELLAR_HORIZON_URL) {
    config.STELLAR_HORIZON_URL =
      network === 'TESTNET'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org';
  }

  if (!config.STELLAR_EXPERT_BASE_URL) {
    config.STELLAR_EXPERT_BASE_URL =
      network === 'TESTNET'
        ? 'https://stellar.expert/explorer/testnet'
        : 'https://stellar.expert/explorer/public';
  }

  if (!config.FRONTEND_URL) {
    config.FRONTEND_URL = 'http://localhost:5173';
  }

  if (config.NODE_ENV === 'production' && !config.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is required in production');
  }

  return config;
}
