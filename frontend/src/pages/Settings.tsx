import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import useWalletStore from '../stores/wallet.store';
import { Shield, Check, Wallet, Building2, Copy } from 'lucide-react';
import { merchantsApi } from '../services/api/merchants.api';
import { hasAccessToken } from '../services/api/api-client';

export const Settings: React.FC = () => {
  const { address, network } = useWalletStore();
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !hasAccessToken()) {
      setSettingsError(null);
      return;
    }

    merchantsApi
      .current()
      .then((merchant) => {
        setBusinessName(merchant.businessName);
        setSupportEmail(merchant.supportEmail || '');
        setSlug(merchant.slug);
        setSettingsError(null);
      })
      .catch((error) => {
        setSettingsError(error instanceof Error ? error.message : 'Unable to load merchant settings');
      });
  }, [address]);

  const handleCopyWallet = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !hasAccessToken()) {
      setSettingsError('Connect Freighter before saving settings.');
      return;
    }

    await merchantsApi.updateCurrent({
      businessName,
      supportEmail,
      slug,
      defaultWalletAddress: address || undefined,
    });
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        
        {/* Left Side forms */}
        <div className="lg:col-span-2 space-y-md">
          {successMsg && (
            <div className="bg-green-50 border border-success text-success p-md rounded-lg flex items-center gap-sm font-bold text-sm">
              <Check size={18} /> Settings saved successfully!
            </div>
          )}
          {settingsError && (
            <div className="bg-red-50 border border-error text-error p-md rounded-lg flex items-center gap-sm font-bold text-sm">
              {settingsError}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl space-y-md shadow-sm">
            <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5 border-b border-outline-variant/30 pb-xs">
              <Building2 size={18} className="text-secondary" /> Business Profile Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Merchant Name</label>
                <input 
                  type="text" 
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Support Email</label>
                <input 
                  type="email" 
                  value={supportEmail}
                  onChange={(event) => setSupportEmail(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Merchant Slug</label>
                <input 
                  type="text" 
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
                />
            </div>

            <div className="space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Invoice Receipt Footnote</label>
              <textarea 
                rows={2}
                defaultValue="Thank you for using Stellar blockchain invoices. All payments are final."
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>

            <button 
              type="submit"
              className="bg-primary text-on-primary font-label-sm text-xs py-3 px-6 rounded-lg hover:opacity-90 font-bold"
            >
              Save Configuration
            </button>
          </form>
        </div>

        {/* Right Side: Wallet details and information status */}
        <div className="space-y-md">
          {/* Wallet integration details */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl space-y-md shadow-sm">
            <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5">
              <Wallet size={18} className="text-secondary" /> Connected Wallet Metadata
            </h3>
            <p className="text-on-surface-variant text-xs">
              This address will serve as the destination wallet where customer payments will settle directly.
            </p>

            <div className="space-y-sm bg-surface-container-low/40 p-sm rounded-lg border border-outline-variant/30 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Stellar Network:</span>
                <span className="font-bold text-secondary uppercase font-mono-data">{network}</span>
              </div>
              <div className="space-y-xs pt-xs border-t border-dashed border-outline-variant/20">
                <span className="text-on-surface-variant block">Settlement Address:</span>
                <div className="flex items-center gap-2 bg-white border border-outline-variant p-2 rounded w-full justify-between">
                <span className="font-mono-data break-all text-[11px] truncate flex-grow">
                    {address || 'No wallet connected'}
                </span>
                  {address && (
                    <button 
                      onClick={handleCopyWallet}
                      className="p-1 hover:text-primary transition-colors text-on-surface-variant"
                    >
                      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Security details card */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl space-y-md shadow-sm text-xs leading-relaxed text-on-surface-variant">
            <h4 className="font-bold text-primary flex items-center gap-1">
              <Shield size={14} className="text-secondary" /> Decoupled Security Model
            </h4>
            <p>
              Lumora Pay uses a decentralized design model. We do not maintain custodial databases of client private keys. All transactions are composed locally and passed to Freighter Wallet for secure signature confirmation.
            </p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};
export default Settings;
