import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import useWalletStore from '../stores/wallet.store';
import { Shield, Check, Wallet, Building2, Copy } from 'lucide-react';
import { merchantsApi } from '../services/api/merchants.api';
import { hasAccessToken } from '../services/api/api-client';
import { pilotApi } from '../services/api/pilot.api';
import type { FeedbackCategory, PilotOverviewDto } from '../types/api.types';

export const Settings: React.FC = () => {
  const { address, network } = useWalletStore();
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [pilotOverview, setPilotOverview] = useState<PilotOverviewDto | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>('GENERAL');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackConsent, setFeedbackConsent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

    pilotApi.overview().then(setPilotOverview).catch(() => setPilotOverview(null));
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

  const handleSubmitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!address || !hasAccessToken()) {
      setFeedbackStatus({ type: 'error', text: 'Connect Freighter before submitting feedback.' });
      return;
    }

    setFeedbackLoading(true);
    setFeedbackStatus(null);
    try {
      await pilotApi.feedback({
        category: feedbackCategory,
        rating: feedbackRating,
        message: feedbackMessage,
        contactConsent: feedbackConsent,
        metadata: { source: 'settings' },
      });
      setFeedbackStatus({ type: 'success', text: 'Feedback submitted. Thank you for improving the MVP.' });
      setFeedbackMessage('');
      const overview = await pilotApi.overview();
      setPilotOverview(overview);
    } catch (error) {
      setFeedbackStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to submit feedback',
      });
    } finally {
      setFeedbackLoading(false);
    }
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

          <form onSubmit={handleSubmitFeedback} className="bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl space-y-md shadow-sm">
            <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5 border-b border-outline-variant/30 pb-xs">
              <Check size={18} className="text-secondary" /> Pilot Feedback
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              <div className="space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Category</label>
                <select
                  value={feedbackCategory}
                  onChange={(event) => setFeedbackCategory(event.target.value as FeedbackCategory)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
                >
                  {['GENERAL', 'UX', 'BUG', 'PAYMENT', 'WALLET', 'ESCROW', 'DOCUMENTATION'].map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Rating</label>
                <select
                  value={feedbackRating}
                  onChange={(event) => setFeedbackRating(Number(event.target.value))}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating} / 5</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-on-surface-variant md:pt-6">
                <input
                  type="checkbox"
                  checked={feedbackConsent}
                  onChange={(event) => setFeedbackConsent(event.target.checked)}
                  className="rounded border-outline-variant"
                />
                Contact allowed
              </label>
            </div>
            <div className="space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Feedback</label>
              <textarea
                rows={4}
                value={feedbackMessage}
                onChange={(event) => setFeedbackMessage(event.target.value)}
                placeholder="What worked, what blocked you, and what should be improved before production?"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            {feedbackStatus && (
              <div className={`${feedbackStatus.type === 'success' ? 'bg-green-50 border-success text-success' : 'bg-red-50 border-error text-error'} border p-sm rounded-lg text-sm font-bold`}>
                {feedbackStatus.text}
              </div>
            )}
            <button
              type="submit"
              disabled={feedbackLoading || feedbackMessage.trim().length < 10}
              className="bg-secondary-container text-on-secondary-container font-label-sm text-xs py-3 px-6 rounded-lg hover:bg-secondary-fixed-dim font-bold disabled:opacity-50"
            >
              {feedbackLoading ? 'Submitting Feedback...' : 'Submit Feedback'}
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

          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl space-y-md shadow-sm text-xs">
            <h4 className="font-bold text-primary flex items-center gap-1">
              <Check size={14} className="text-secondary" /> Level 4 Pilot Evidence
            </h4>
            {pilotOverview ? (
              <div className="space-y-sm">
                {[
                  ['Verified wallets', `${pilotOverview.totals.verifiedWallets}/${pilotOverview.level4Targets.minimumRealUsers}`],
                  ['Wallet proofs', `${pilotOverview.totals.uniqueInteractedWallets}/${pilotOverview.level4Targets.minimumRealUsers}`],
                  ['Feedback responses', `${pilotOverview.totals.feedbackResponses}`],
                  ['Analytics events', `${pilotOverview.totals.productEvents}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-outline-variant/30 pb-1">
                    <span className="text-on-surface-variant">{label}</span>
                    <span className="font-mono-data font-bold text-primary">{value}</span>
                  </div>
                ))}
                <div className="pt-xs grid grid-cols-2 gap-xs">
                  {[
                    ['Users', pilotOverview.readiness.usersOnboarded],
                    ['Wallet proof', pilotOverview.readiness.walletProofCaptured],
                    ['Feedback', pilotOverview.readiness.feedbackCollected],
                    ['Contracts', pilotOverview.readiness.contractsConfigured],
                  ].map(([label, ready]) => (
                    <span
                      key={String(label)}
                      className={`${ready ? 'bg-green-50 text-success border-success/30' : 'bg-red-50 text-error border-error/30'} border rounded px-2 py-1 font-bold text-center`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-on-surface-variant">Connect Freighter to load pilot evidence.</p>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};
export default Settings;
