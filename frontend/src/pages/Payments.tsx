import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { usePaymentStore } from '../stores/payment.store';
import { formatAmount, truncateAddress } from '../utils/format';
import { QrCode, ExternalLink, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Payments: React.FC = () => {
  const { payments, fetchPayments } = usePaymentStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPayments()
      .then(() => setError(null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load payments'))
      .finally(() => setLoading(false));
  }, [fetchPayments]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-xs bg-green-50 text-success px-2.5 py-1 rounded-full font-label-sm text-xs border border-green-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Confirmed
          </span>
        );
      case 'PENDING':
      case 'SUBMITTED':
      case 'AWAITING_SIGNATURE':
      case 'SIGNED':
      case 'CREATED':
        return (
          <span className="inline-flex items-center gap-xs bg-yellow-50 text-warning px-2.5 py-1 rounded-full font-label-sm text-xs border border-yellow-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span> Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-xs bg-red-50 text-error px-2.5 py-1 rounded-full font-label-sm text-xs border border-red-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Failed
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="p-md border-b border-outline-variant bg-surface-container-low/50 flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5">
            <QrCode size={18} className="text-secondary" /> Stellar Network Inbound Payments
          </h3>
          <span className="font-label-sm text-xs text-on-surface-variant font-bold">
            Total {payments.length} payments
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-on-surface-variant text-sm">Loading payments...</div>
        ) : error ? (
          <div className="text-center py-16 text-error text-sm font-bold">{error}</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 space-y-sm">
            <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant mx-auto">
              <QrCode size={20} />
            </div>
            <h3 className="font-headline-md text-headline-md font-bold text-primary">No payments recorded</h3>
            <p className="text-on-surface-variant text-sm max-w-xs mx-auto">
              Once payments are confirmed on-chain, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/50 font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">
                  <th className="p-md">Payment ID</th>
                  <th className="p-md">Invoice ID</th>
                  <th className="p-md">Sender wallet</th>
                  <th className="p-md">Timestamp</th>
                  <th className="p-md text-right">Amount settled</th>
                  <th className="p-md text-center">Horizon block</th>
                  <th className="p-md">Status</th>
                  <th className="p-md text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low/30 transition-colors">
                    <td className="p-md font-mono-data text-xs text-primary font-bold">{p.id}</td>
                    <td className="p-md font-mono-data text-xs text-primary font-bold hover:underline">
                      <Link to={`/app/invoices/${p.invoiceId}`}>{p.invoiceId}</Link>
                    </td>
                    <td className="p-md font-mono-data text-xs text-mutedGray" title={p.fromWallet}>
                      {truncateAddress(p.fromWallet)}
                    </td>
                    <td className="p-md text-on-surface-variant text-xs">{p.timestamp}</td>
                    <td className="p-md text-right font-mono-amount font-bold text-success">+{formatAmount(p.amount)} {p.asset}</td>
                    <td className="p-md text-center font-mono-data text-xs">
                      <a 
                        href={p.explorerUrl || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`hover:text-secondary underline flex items-center justify-center gap-0.5 ${p.explorerUrl ? '' : 'pointer-events-none opacity-50'}`}
                      >
                        {p.ledger} <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="p-md">{getStatusBadge(p.status)}</td>
                    <td className="p-md text-right">
                      {p.status === 'CONFIRMED' ? (
                        <Link 
                          to={`/receipt/${p.id}`}
                          className="text-secondary hover:text-secondary-fixed-dim font-bold flex items-center justify-end gap-0.5 text-xs hover:underline"
                        >
                          View Receipt <ArrowRight size={12} />
                        </Link>
                      ) : (
                        <span className="text-on-surface-variant text-xs font-bold">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default Payments;
