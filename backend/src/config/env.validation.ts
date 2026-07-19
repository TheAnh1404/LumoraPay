import * as StellarSdk from '@stellar/stellar-sdk';

type Env = Record<string, string | undefined>;

const REQUIRED_IN_ALL_ENVIRONMENTS = ['DATABASE_URL'] as const;
const LOCAL_HOST_PATTERNS = [
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
];

function csv(value?: string) {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function assertValidUrl(key: string, value?: string) {
  if (!value) return;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error(`${key} must be a valid http(s) URL`);
  }
}

function isLocalOrigin(value: string) {
  return LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(value));
}

function assertContractId(key: string, value?: string) {
  if (!value) return;
  if (!StellarSdk.StrKey.isValidContract(value)) {
    throw new Error(`${key} must be a valid Stellar contract ID`);
  }
}

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

  assertValidUrl('FRONTEND_URL', config.FRONTEND_URL);
  for (const origin of csv(config.FRONTEND_URLS)) {
    assertValidUrl('FRONTEND_URLS entry', origin);
  }

  const feeBps = Number(config.PLATFORM_FEE_BPS || 50);
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10_000) {
    throw new Error('PLATFORM_FEE_BPS must be an integer from 0 to 10000');
  }

  assertContractId(
    'INVOICE_REGISTRY_CONTRACT_ID',
    config.INVOICE_REGISTRY_CONTRACT_ID,
  );
  assertContractId(
    'PAYMENT_ESCROW_CONTRACT_ID',
    config.PAYMENT_ESCROW_CONTRACT_ID,
  );

  if (config.NODE_ENV === 'production') {
    if (!config.JWT_ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET is required in production');
    }

    if (!config.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is required in production');
    }

    const allowedOrigins = [config.FRONTEND_URL, ...csv(config.FRONTEND_URLS)];
    if (allowedOrigins.some((origin) => isLocalOrigin(origin || ''))) {
      throw new Error(
        'Production FRONTEND_URL/FRONTEND_URLS cannot point to localhost',
      );
    }

    if (!config.INVOICE_REGISTRY_CONTRACT_ID) {
      throw new Error('INVOICE_REGISTRY_CONTRACT_ID is required in production');
    }

    if (!config.PAYMENT_ESCROW_CONTRACT_ID) {
      throw new Error('PAYMENT_ESCROW_CONTRACT_ID is required in production');
    }
  }

  return config;
}
