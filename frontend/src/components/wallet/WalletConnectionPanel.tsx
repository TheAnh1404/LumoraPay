import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  FileCheck2,
  Layers3,
  Loader2,
  Network,
  Rocket,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import useWalletStore from '../../stores/wallet.store';
import { contractsApi, type ContractConfigDto } from '../../services/api/contracts.api';
import { truncateAddress } from '../../utils/format';

type ReadinessState = 'ready' | 'attention' | 'blocked' | 'pending';

interface ReadinessLevel {
  level: string;
  name: string;
  title: string;
  detail: string;
  state: ReadinessState;
  icon: LucideIcon;
}

const stateCopy: Record<ReadinessState, string> = {
  ready: 'Ready',
  attention: 'Action needed',
  blocked: 'Blocked',
  pending: 'Pending',
};

const stateClasses: Record<ReadinessState, string> = {
  ready: 'border-success/30 bg-green-50 text-success',
  attention: 'border-warning/30 bg-yellow-50 text-warning',
  blocked: 'border-error/30 bg-red-50 text-error',
  pending: 'border-outline-variant bg-surface-container-low text-on-surface-variant',
};

function buildReadinessLevels(
  isConnected: boolean,
  contractConfig: ContractConfigDto | null,
  contractError: string | null,
): ReadinessLevel[] {
  const contractsConfigured = Boolean(
    contractConfig?.invoiceRegistryConfigured && contractConfig?.paymentEscrowConfigured,
  );
  const contractState: ReadinessState = contractError ? 'blocked' : contractsConfigured ? 'ready' : 'attention';

  return [
    {
      level: 'Level 1',
      name: 'White Belt',
      title: 'Wallets, transactions, multi-account safety',
      detail: isConnected
        ? 'Freighter auth, Testnet network check, live balance, and direct XLM payment rails are active.'
        : 'Connect Freighter to unlock live wallet auth, balance, faucet, invoices, and payment signing.',
      state: isConnected ? 'ready' : 'attention',
      icon: Wallet,
    },
    {
      level: 'Level 2',
      name: 'Yellow Belt',
      title: 'Contracts, events, contract write path',
      detail: contractsConfigured
        ? 'Soroban contract IDs are configured and contract health can be checked from the app.'
        : 'Direct XLM works now. Add real Soroban contract IDs before enabling escrow/event flows.',
      state: contractState,
      icon: Code2,
    },
    {
      level: 'Level 3',
      name: 'Orange Belt',
      title: 'Mini dApp, tests, production basics',
      detail: contractsConfigured
        ? 'Invoice, checkout, receipt, refund, and contract config surfaces are wired for a complete MVP pass.'
        : 'Mini dApp direct-payment flow is usable; advanced contract features remain gated by deployment.',
      state: isConnected ? 'ready' : 'pending',
      icon: FileCheck2,
    },
    {
      level: 'Level 4',
      name: 'Green Belt',
      title: 'Production MVP and 10 Testnet users',
      detail: isConnected
        ? 'Merchant onboarding, public checkout links, receipts, faucet, and wallet history support a Testnet pilot.'
        : 'Connect a merchant wallet before starting the 10-user Testnet pilot path.',
      state: isConnected ? 'ready' : 'pending',
      icon: Rocket,
    },
  ];
}

export function WalletConnectionPanel() {
  const { status, address, network, balance, isInstalled, error, connect, disconnect } = useWalletStore();
  const [contractConfig, setContractConfig] = useState<ContractConfigDto | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);

  const isConnected = status === 'connected' && Boolean(address);
  const isConnecting = status === 'connecting';

  useEffect(() => {
    let mounted = true;
    contractsApi
      .config()
      .then((config) => {
        if (!mounted) return;
        setContractConfig(config);
        setContractError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setContractError(err instanceof Error ? err.message : 'Unable to load contract configuration');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const levels = useMemo(
    () => buildReadinessLevels(isConnected, contractConfig, contractError),
    [contractConfig, contractError, isConnected],
  );

  const handleConnect = async () => {
    setConnectMessage(null);
    const connectedAddress = await connect();
    if (!connectedAddress) {
      setConnectMessage(useWalletStore.getState().error || 'Unable to connect Freighter.');
    }
  };

  const statusLabel = isConnected
    ? 'Connected'
    : status === 'wrong_network'
      ? 'Wrong network'
      : isConnecting
        ? 'Waiting for Freighter'
        : 'Disconnected';

  const statusIcon = isConnected ? (
    <CheckCircle2 size={18} />
  ) : isConnecting ? (
    <Loader2 size={18} className="animate-spin" />
  ) : status === 'wrong_network' ? (
    <AlertTriangle size={18} />
  ) : (
    <XCircle size={18} />
  );

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="p-md md:p-lg space-y-md">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-md">
            <div className="space-y-sm">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                <ShieldCheck size={16} className="text-secondary" />
                Stellar wallet session
              </span>
              <div>
                <h3 className="font-headline-md text-headline-md text-primary font-bold">
                  Connect Freighter to use Lumora Pay
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant max-w-2xl">
                  The app signs a backend challenge, stores a short-lived API token locally, and keeps payments non-custodial.
                </p>
              </div>
            </div>

            <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${stateClasses[isConnected ? 'ready' : status === 'wrong_network' ? 'attention' : 'pending']}`}>
              {statusIcon}
              {statusLabel}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            <div className="rounded-lg border border-outline-variant bg-surface p-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Provider</p>
              <p className="mt-1 font-bold text-primary">Freighter</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface p-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Network</p>
              <p className="mt-1 font-bold text-primary">{network}</p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface p-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Balance</p>
              <p className="mt-1 font-mono-amount font-bold text-primary">{balance} XLM</p>
            </div>
          </div>

          {address && (
            <div className="rounded-lg border border-outline-variant bg-surface p-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Active wallet</p>
              <p className="mt-1 font-mono-data text-sm text-primary break-all">{address}</p>
            </div>
          )}

          {(connectMessage || error) && (
            <div className="rounded-lg border border-error/30 bg-error-container p-sm text-sm font-bold text-on-error-container">
              {connectMessage || error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-sm">
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-label-sm text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Wallet size={18} />}
              {isConnecting ? 'Waiting for Freighter...' : isConnected ? 'Reconnect Wallet' : 'Connect Freighter'}
            </button>
            {isConnected && (
              <button
                type="button"
                onClick={disconnect}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-5 font-label-sm text-sm font-bold text-primary transition-colors hover:bg-surface-container-low"
              >
                Disconnect {address ? truncateAddress(address) : ''}
              </button>
            )}
            {!isInstalled && !isConnecting && (
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-5 font-label-sm text-sm font-bold text-primary transition-colors hover:bg-surface-container-low"
              >
                Install Freighter
              </a>
            )}
          </div>
        </div>

        <div className="border-t border-outline-variant bg-surface-container-low p-md md:p-lg xl:border-l xl:border-t-0">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <Layers3 size={16} className="text-secondary" />
            Stellar Anchor levels
          </div>
          <div className="mt-sm space-y-sm">
            {levels.map((level) => {
              const Icon = level.icon;
              return (
                <div key={level.level} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-sm">
                  <div className="flex items-start gap-sm">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                          {level.level} / {level.name}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${stateClasses[level.state]}`}>
                          {stateCopy[level.state]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-primary">{level.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{level.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {contractConfig && (
            <div className="mt-sm flex items-center gap-2 rounded-lg border border-outline-variant bg-surface p-sm text-xs text-on-surface-variant">
              <Network size={16} className="text-secondary" />
              Contract config: {contractConfig.network}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default WalletConnectionPanel;
