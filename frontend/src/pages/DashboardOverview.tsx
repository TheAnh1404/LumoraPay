import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useWalletStore } from '../stores/wallet.store';
import { useInvoiceStore } from '../stores/invoice.store';
import { formatAmount, formatDate } from '../utils/format';
import { merchantsApi } from '../services/api/merchants.api';
import { hasAccessToken } from '../services/api/api-client';
import type { DashboardStatsDto } from '../types/api.types';
import { 
  TrendingUp, 
  PlusCircle, 
  Droplet, 
  History, 
  ArrowRight, 
  Info, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { address, requestFaucet } = useWalletStore();
  const { invoices, fetchInvoices } = useInvoiceStore();
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMsg, setFaucetMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [merchantSlug, setMerchantSlug] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [creatingMerchant, setCreatingMerchant] = useState(false);

  useEffect(() => {
    if (!address || !hasAccessToken()) {
      setStats(null);
      setDashboardError(null);
      return;
    }

    fetchInvoices().catch(() => undefined);
    merchantsApi.dashboard()
      .then((data) => {
        setStats(data);
        setDashboardError(null);
      })
      .catch((err) => {
        setDashboardError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
      });
  }, [fetchInvoices, address]);

  const handleFaucetRequest = async () => {
    if (!address) {
      setFaucetMsg({ type: 'error', text: 'Please connect your wallet first.' });
      return;
    }
    setFaucetLoading(true);
    setFaucetMsg(null);
    try {
      const success = await requestFaucet();
      if (success) {
        setFaucetMsg({ type: 'success', text: '100 Testnet XLM has been funded into your wallet!' });
      } else {
        setFaucetMsg({ type: 'error', text: 'Faucet request failed. Try again.' });
      }
    } catch {
      setFaucetMsg({ type: 'error', text: 'Error calling testnet faucet.' });
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleCreateMerchant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!address) return;
    setCreatingMerchant(true);
    try {
      await merchantsApi.create({
        businessName,
        slug: merchantSlug,
        supportEmail,
        defaultWalletAddress: address,
      });
      const data = await merchantsApi.dashboard();
      setStats(data);
      setDashboardError(null);
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : 'Failed to create merchant profile');
    } finally {
      setCreatingMerchant(false);
    }
  };

  const getStatusBadge = (invoiceStatus: string) => {
    switch (invoiceStatus) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-xs bg-green-50 text-success px-2.5 py-1 rounded-full font-label-sm text-xs border border-green-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Paid
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-xs bg-blue-50 text-info px-2.5 py-1 rounded-full font-label-sm text-xs border border-blue-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-info"></span> Open
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-xs bg-red-50 text-error px-2.5 py-1 rounded-full font-label-sm text-xs border border-red-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span> {invoiceStatus}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-xs bg-gray-50 text-mutedGray px-2.5 py-1 rounded-full font-label-sm text-xs border border-gray-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-mutedGray"></span> {invoiceStatus}
          </span>
        );
    }
  };

  // Show only 3 recent invoices
  const recentInvoices = (stats?.recentInvoices || invoices).slice(0, 3);

  return (
    <DashboardLayout>
      {/* Testnet Notice */}
      <div className="bg-secondary-container/10 border border-secondary text-on-secondary-container p-md rounded-lg flex gap-md items-start">
        <Info className="text-secondary mt-1 flex-shrink-0" size={20} />
        <div>
          <h4 className="font-headline-md text-headline-md text-secondary mb-1">Testnet Environment Active</h4>
          <p className="font-body-md text-body-md opacity-90">
            You are currently viewing data on the Stellar Testnet. All transactions, invoices, and balances shown here use test assets and hold no real-world value. Ensure you switch to Mainnet before processing actual payments.
          </p>
        </div>
      </div>

      {/* Faucet Toast Feedback */}
      {faucetMsg && (
        <div className={`border p-md rounded-lg flex gap-md items-start ${
          faucetMsg.type === 'success' ? 'bg-green-50 border-success text-success' : 'bg-red-50 border-error text-error'
        }`}>
          {faucetMsg.type === 'success' ? <CheckCircle size={20} className="mt-1" /> : <XCircle size={20} className="mt-1" />}
          <p className="font-body-md font-bold">{faucetMsg.text}</p>
        </div>
      )}

      {dashboardError && (
        <div className="bg-red-50 border border-error text-error p-md rounded-lg flex gap-md items-start">
          <XCircle size={20} className="mt-1 flex-shrink-0" />
          <p className="font-body-md font-bold">{dashboardError}</p>
        </div>
      )}

      {dashboardError && address && (
        <form onSubmit={handleCreateMerchant} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md grid grid-cols-1 md:grid-cols-4 gap-sm items-end shadow-sm">
          <div className="space-y-xs">
            <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Business Name</label>
            <input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              required
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-xs">
            <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Slug</label>
            <input
              value={merchantSlug}
              onChange={(event) => setMerchantSlug(event.target.value)}
              required
              placeholder="my-business"
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-xs">
            <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Support Email</label>
            <input
              value={supportEmail}
              onChange={(event) => setSupportEmail(event.target.value)}
              type="email"
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={creatingMerchant}
            className="bg-primary text-on-primary font-label-sm text-sm px-4 py-2.5 rounded hover:opacity-95 transition-all font-bold shadow-sm disabled:opacity-50"
          >
            {creatingMerchant ? 'Creating...' : 'Create Merchant'}
          </button>
        </form>
      )}

      {/* Summary Cards (Bento style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* Total Received */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg hover:border-secondary transition-colors group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-surface-container-low rounded-bl-full -z-10 group-hover:bg-secondary-container/10 transition-colors"></div>
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs uppercase tracking-wider text-xs">Total Received</p>
          <div className="flex items-baseline gap-xs">
            <span className="font-mono-amount text-mono-amount text-[32px] text-primary">{stats?.totalReceived || '0.00'}</span>
            <span className="font-mono-data text-mono-data text-on-surface-variant text-sm font-bold">XLM</span>
          </div>
        </div>

        {/* Paid Invoices */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg hover:border-secondary transition-colors group relative overflow-hidden">
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs uppercase tracking-wider text-xs">Paid Invoices</p>
          <div className="flex items-center gap-sm">
            <span className="font-mono-amount text-mono-amount text-[32px] text-primary">{stats?.paidInvoices || 0}</span>
            <span className="bg-green-50 text-success px-2 py-0.5 rounded font-mono-data text-[12px] border border-green-200 flex items-center gap-1 font-bold">
              <TrendingUp size={12} /> Live
            </span>
          </div>
        </div>

        {/* Open Invoices */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg hover:border-secondary transition-colors group relative overflow-hidden">
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs uppercase tracking-wider text-xs">Open Invoices</p>
          <span className="font-mono-amount text-mono-amount text-[32px] text-primary">{stats?.openInvoices || 0}</span>
        </div>

        {/* Success Rate */}
        <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg hover:border-secondary transition-colors group relative overflow-hidden">
          <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs uppercase tracking-wider text-xs">Success Rate</p>
          <span className="font-mono-amount text-mono-amount text-[32px] text-primary">{stats?.paymentSuccessRate !== undefined ? stats.paymentSuccessRate : 100}%</span>
          <div className="w-full bg-surface-container h-1.5 mt-sm rounded-full overflow-hidden">
            <div className="bg-primary h-full" style={{ width: `${stats?.paymentSuccessRate !== undefined ? stats.paymentSuccessRate : 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Chart and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
          <div className="p-md border-b border-outline-variant bg-surface-container-low/50 flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-primary font-bold">Revenue Activity</h3>
            <div className="flex gap-2">
              <button className="font-label-sm text-label-sm px-3 py-1 bg-primary text-on-primary rounded font-bold">7D</button>
              <button className="font-label-sm text-label-sm px-3 py-1 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors font-bold">30D</button>
            </div>
          </div>
          <div className="p-md flex-grow min-h-[300px] h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueHistory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD84D" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#FFD84D" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 11 }} />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#D8D4CA', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#080808' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#080808" strokeWidth={2} fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex flex-col justify-center gap-md">
          <h3 className="font-headline-md text-headline-md text-primary font-bold mb-2">Quick Actions</h3>
          
          <button 
            onClick={() => navigate('/app/invoices/create')}
            className="w-full bg-primary text-on-primary font-label-sm text-label-sm py-4 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-sm font-bold shadow-sm"
          >
            <PlusCircle size={18} />
            Create New Invoice
          </button>
          
          <button 
            onClick={handleFaucetRequest}
            disabled={faucetLoading}
            className="w-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm py-4 px-4 rounded-lg hover:bg-secondary-fixed-dim transition-colors flex items-center justify-center gap-sm font-bold shadow-sm disabled:opacity-50"
          >
            <Droplet size={18} className={faucetLoading ? 'animate-bounce' : ''} />
            {faucetLoading ? 'Requesting Faucet...' : 'Request Testnet XLM'}
          </button>
          
          <button 
            onClick={() => navigate('/wallet/history')}
            className="w-full bg-surface-container-lowest border border-primary text-primary font-label-sm text-label-sm py-4 px-4 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-center gap-sm font-bold shadow-sm"
          >
            <History size={18} />
            View Transaction History
          </button>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="p-md border-b border-outline-variant bg-surface-container-low/50 flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">Recent Invoices</h3>
          <Link to="/app/invoices" className="font-label-sm text-label-sm text-secondary hover:underline flex items-center gap-xs font-bold">
            View All <ArrowRight size={16} />
          </Link>
        </div>
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/50 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-xs">
                <th className="p-md font-normal">Invoice ID</th>
                <th className="p-md font-normal">Client</th>
                <th className="p-md font-normal">Date Created</th>
                <th className="p-md font-normal">Amount</th>
                <th className="p-md font-normal">Status</th>
                <th className="p-md font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md">
              {recentInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low/30 transition-colors">
                  <td className="p-md font-mono-data text-mono-data text-primary font-bold">
                    <Link to={`/app/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                  </td>
                  <td className="p-md font-bold text-primary">{inv.customerName}</td>
                  <td className="p-md text-on-surface-variant">{formatDate(inv.createdAt)}</td>
                  <td className="p-md font-mono-amount text-mono-amount text-primary">{formatAmount(inv.amount)} {inv.asset}</td>
                  <td className="p-md">{getStatusBadge(inv.status)}</td>
                  <td className="p-md text-right">
                    <Link 
                      to={`/app/invoices/${inv.id}`}
                      className="text-on-surface-variant hover:text-primary p-1 inline-block transition-colors"
                      title="View Details"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="md:hidden divide-y divide-outline-variant/30">
          {recentInvoices.map((inv) => (
            <div key={inv.id} className="p-md flex flex-col gap-2 bg-surface-container-lowest">
              <div className="flex justify-between items-center">
                <span className="font-mono-data text-mono-data text-primary font-bold">{inv.invoiceNumber}</span>
                {getStatusBadge(inv.status)}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-primary">{inv.customerName}</span>
                <span className="font-mono-amount text-mono-amount text-primary font-bold">
                  {formatAmount(inv.amount)} {inv.asset}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-on-surface-variant pt-1 border-t border-dashed border-outline-variant/20">
                <span>Created: {formatDate(inv.createdAt)}</span>
                <Link to={`/app/invoices/${inv.id}`} className="text-secondary font-bold hover:underline flex items-center gap-1">
                  Details <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};
export default DashboardOverview;
