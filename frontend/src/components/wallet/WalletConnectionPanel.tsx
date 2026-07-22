import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import useWalletStore from '../../stores/wallet.store';
import { truncateAddress } from '../../utils/format';

const stateClasses = {
  ready: 'border-success/30 bg-green-50 text-success',
  attention: 'border-warning/30 bg-yellow-50 text-warning',
  pending: 'border-outline-variant bg-surface-container-low text-on-surface-variant',
};

export function WalletConnectionPanel() {
  const { status, address, network, balance, isInstalled, error, connect, disconnect } = useWalletStore();
  const [connectMessage, setConnectMessage] = useState<string | null>(null);

  const isConnected = status === 'connected' && Boolean(address);
  const isConnecting = status === 'connecting';

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
    <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm p-md md:p-lg space-y-md">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-md">
        <div className="space-y-sm">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <ShieldCheck size={16} className="text-secondary" />
            Stellar Wallet Session
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
    </section>
  );
}

export default WalletConnectionPanel;
