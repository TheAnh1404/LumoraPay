import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useInvoiceStore } from '../stores/invoice.store';
import { formatAmount } from '../utils/format';
import { Link } from 'react-router-dom';
import { Copy, Check, ExternalLink } from 'lucide-react';


export const CheckoutLinks: React.FC = () => {
  const { invoices, fetchInvoices } = useInvoiceStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices().catch(() => undefined).finally(() => setLoading(false));
  }, [fetchInvoices]);

  const activeInvoices = invoices.filter(inv => inv.status === 'OPEN');

  const handleCopy = (id: string) => {
    const invoice = invoices.find((item) => item.id === id);
    const url = `${window.location.origin}/pay/${invoice?.publicToken || id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md space-y-md shadow-sm">
        <h3 className="font-headline-md text-headline-md text-primary font-bold">Checkout Links Generator</h3>
        <p className="text-on-surface-variant text-sm max-w-2xl">
          Checkout links allow you to accept payments from your clients immediately. Each open invoice has a unique secure payment link that you can share via email, chat, or embed directly.
        </p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="p-md border-b border-outline-variant bg-surface-container-low/50">
          <h4 className="font-bold text-primary text-sm">Active Checkout Links</h4>
        </div>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant text-sm">Loading checkout links...</div>
        ) : activeInvoices.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant text-sm">
            No active open invoices found. Please <Link to="/app/invoices/create" className="text-secondary hover:underline">create an invoice</Link> to generate checkout links.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/30">
            {activeInvoices.map(inv => {
              const payUrl = `${window.location.origin}/pay/${inv.publicToken}`;
              return (
                <div key={inv.id} className="p-md flex flex-col md:flex-row md:items-center justify-between gap-md text-sm">
                  <div className="space-y-1">
                    <span className="font-mono-data text-xs text-on-surface-variant bg-surface px-1.5 py-0.5 rounded border border-outline-variant">
                      {inv.invoiceNumber}
                    </span>
                    <h5 className="font-bold text-primary">{inv.title}</h5>
                    <p className="text-xs text-mutedGray">Client: {inv.customerName} ({inv.customerEmail})</p>
                  </div>

                  <div className="flex items-center gap-md">
                    <span className="font-mono-amount font-bold text-primary mr-2">
                      {formatAmount(inv.amount)} {inv.asset}
                    </span>
                    
                    <div className="flex items-center gap-sm">
                      <input
                        type="text"
                        readOnly
                        value={payUrl}
                        className="bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs font-mono-data w-[180px] md:w-[240px] outline-none"
                      />
                      
                      <button
                        onClick={() => handleCopy(inv.id)}
                        className="p-2 border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                        title="Copy payment link"
                      >
                        {copiedId === inv.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      </button>

                      <Link
                        to={`/pay/${inv.publicToken}`}
                        className="p-2 bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                        title="Test Payment Checkout"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default CheckoutLinks;
