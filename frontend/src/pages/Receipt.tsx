import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatAmount } from '../utils/format';
import { Printer, ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { paymentsApi } from '../services/api/payments.api';
import type { ReceiptDto } from '../types/api.types';

export const Receipt: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!receiptId) return;
    paymentsApi
      .receipt(receiptId)
      .then((res) => setReceipt(res))
      .catch(() => setReceipt(null))
      .finally(() => setLoading(false));
  }, [receiptId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center font-bold text-on-surface-variant">
        Loading receipt...
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center font-bold text-error">
        Receipt not found.
      </div>
    );
  }

  const { payment, invoice } = receipt;
  const explorerUrl = receipt.explorerUrl || payment.explorerUrl || '';

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md text-body-md py-lg flex justify-center items-center">
      <div className="w-full max-w-2xl bg-white border border-outline-variant rounded-xl p-md md:p-lg space-y-lg shadow-sm print:border-none print:shadow-none relative">
        <div className="flex justify-between items-center no-print">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary font-label-sm text-xs font-bold transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <button
            onClick={handlePrint}
            className="bg-primary text-on-primary font-label-sm text-xs font-bold h-9 px-sm rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Receipt
          </button>
        </div>

        <div className="flex justify-between items-start border-b border-outline-variant pb-md pt-sm">
          <div className="space-y-xs">
            <h1 className="font-headline-md text-headline-md font-black text-primary">LUMORA PAY RECEIPT</h1>
            <p className="text-on-surface-variant text-xs font-bold font-mono-data">RECEIPT ID: {payment.id}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="bg-green-50 text-success text-[10px] px-2 py-0.5 rounded border border-green-200 font-bold uppercase tracking-wider">
              Stellar {receipt.network}
            </span>
            <span className="text-[10px] text-mutedGray">{payment.timestamp}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md text-xs border-b border-outline-variant/30 pb-md">
          <div className="space-y-1">
            <span className="text-on-surface-variant font-bold uppercase tracking-wider block">Merchant Address</span>
            <p className="font-bold text-primary text-sm">{invoice?.merchantName || 'Merchant'}</p>
            <p className="font-mono-data break-all text-on-surface-variant leading-relaxed">{payment.toWallet}</p>
          </div>

          <div className="space-y-1">
            <span className="text-on-surface-variant font-bold uppercase tracking-wider block">Billing Customer</span>
            <p className="font-bold text-primary text-sm">{invoice?.customerName || 'Customer'}</p>
            <p className="text-on-surface-variant">{invoice?.customerEmail || ''}</p>
            <p className="font-mono-data break-all text-on-surface-variant leading-relaxed">Wallet: {payment.fromWallet}</p>
          </div>
        </div>

        <div className="space-y-sm">
          <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold block">
            Transaction Settlement Details
          </span>
          <div className="border border-outline-variant rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant font-label-sm text-on-surface-variant uppercase font-bold tracking-wider">
                  <th className="p-sm">Billing Reference</th>
                  <th className="p-sm text-right">Settled Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-sm font-bold text-primary">
                    Invoice {invoice?.invoiceNumber || payment.invoiceNumber} - {invoice?.title || 'Stellar payment'}
                  </td>
                  <td className="p-sm text-right font-mono-amount font-bold text-primary">
                    {formatAmount(payment.amount)} {payment.asset}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-container-low/40 p-sm rounded-lg border border-outline-variant/30 space-y-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm text-[11px] text-primary">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Ledger Index:</span>
                <span className="font-mono-data font-bold">{payment.ledger}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Stellar Network Fee:</span>
                <span className="font-mono-amount font-bold">{payment.fee} XLM</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Payment Token:</span>
                <span className="font-bold">{payment.asset} (Native Asset)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">System Status:</span>
                <span className="text-success font-bold">{payment.status}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-dashed border-outline-variant/20 pt-sm">
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">
              Cryptographic Horizon Hash Signature
            </span>
            <span className="font-mono-data text-xs text-primary block break-all font-bold select-all leading-relaxed bg-white border border-outline-variant/60 p-sm rounded-md">
              {payment.hash}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-md border-t border-outline-variant/30 pt-md text-xs">
          <div className="space-y-1">
            <h4 className="font-bold text-primary flex items-center gap-1">
              <CheckCircle size={14} className="text-success" /> Immutable Proof of Payment
            </h4>
            <p className="text-on-surface-variant max-w-sm">
              This receipt is backed by a verified Stellar Testnet transaction returned by the backend after Horizon
              confirmation.
            </p>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline inline-flex items-center gap-1 font-bold pt-1 no-print"
              >
                Verify on Stellar.Expert Explorer <ExternalLink size={12} />
              </a>
            )}
          </div>

          {explorerUrl && (
            <div className="bg-white p-1 rounded-lg border border-outline-variant/60">
              <QRCodeSVG value={explorerUrl} size={70} bgColor="#ffffff" fgColor="#080808" />
            </div>
          )}
        </div>

        <div className="text-center text-[10px] text-mutedGray pt-sm border-t border-dashed border-outline-variant/10">
          Generated automatically by Lumora Pay after blockchain verification.
        </div>
      </div>
    </div>
  );
};
export default Receipt;
