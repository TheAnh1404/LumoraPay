import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useWalletStore } from '../stores/wallet.store';
import { Droplet, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';
import { stellarApi } from '../services/api/stellar.api';

export const TestnetFaucet: React.FC = () => {
  const { address, requestFaucet, setBalance } = useWalletStore();
  const [customAddress, setCustomAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleFaucet = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAddr = customAddress.trim() || address;
    
    if (!targetAddr) {
      setResponse({ type: 'error', message: 'Please connect your wallet or specify a custom Stellar address.' });
      return;
    }

    setLoading(true);
    setResponse(null);
    try {
      const result = customAddress.trim() ? await stellarApi.faucet(targetAddr) : { success: await requestFaucet(), balance: '' };
      if (result.success) {
        if (!customAddress.trim() && result.balance) {
          setBalance(parseFloat(result.balance).toFixed(5));
        }
        setResponse({ 
          type: 'success', 
          message: `Successfully funded 100 XLM into wallet address: ${targetAddr.substring(0,6)}...${targetAddr.substring(targetAddr.length-6)}`
        });
      } else {
        setResponse({ type: 'error', message: 'Stellar Friendbot faucet server did not respond. Please try again.' });
      }
    } catch {
      setResponse({ type: 'error', message: 'Error request funding.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-md">
        
        {/* Info card */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl space-y-md shadow-sm">
          <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5">
            <Droplet size={20} className="text-secondary" /> Stellar Friendbot Testnet Faucet
          </h3>
          <p className="text-on-surface-variant text-sm">
            Friendbot is a Stellar Testnet utility that funds developer wallets with 100 testnet XLM immediately, allowing you to pay gas fees and verify smart invoices without staking real funds.
          </p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleFaucet} className="bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl space-y-md shadow-sm">
          {response && (
            <div className={`p-md rounded-lg border flex gap-sm text-sm font-bold ${
              response.type === 'success' ? 'bg-green-50 border-success text-success' : 'bg-red-50 border-error text-error'
            }`}>
              {response.type === 'success' ? <CheckCircle className="flex-shrink-0" size={18} /> : <XCircle className="flex-shrink-0" size={18} />}
              <span>{response.message}</span>
            </div>
          )}

          <div className="space-y-xs">
            <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Target Stellar Address</label>
            <input 
              type="text" 
              placeholder={address || "e.g. GB3S..."}
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2.5 font-mono-data text-xs outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
            />
            {!customAddress && address && (
              <span className="text-[11px] text-mutedGray block">Using currently connected wallet key: {address}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-on-primary font-label-sm text-sm h-12 w-full rounded-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-2 font-bold disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Contacting Stellar Friendbot...
              </>
            ) : (
              <>
                <Droplet size={16} /> Request 100 Testnet XLM
              </>
            )}
          </button>
        </form>

        {/* Faucet details notice */}
        <div className="bg-[#eeeae0] text-on-surface-variant p-sm rounded-lg text-xs leading-relaxed border border-outline-variant/60 flex gap-sm">
          <Info size={18} className="text-secondary mt-0.5 flex-shrink-0" />
          <span>
            These funds exist strictly within the Stellar Testnet ledger and hold no market value. Do not attempt to transfer these assets to Stellar mainnet wallets.
          </span>
        </div>

      </div>
    </DashboardLayout>
  );
};
export default TestnetFaucet;
