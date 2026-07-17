import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CheckoutLayout from '../components/layout/CheckoutLayout';
import { usePaymentStore } from '../stores/payment.store';
import { formatAmount } from '../utils/format';
import { paymentsApi } from '../services/api/payments.api';
import type { PaymentDto } from '../types/api.types';
import { 
  CheckCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Printer,
  ChevronRight
} from 'lucide-react';

export const PaymentSuccess: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const navigate = useNavigate();
  const { currentPayment } = usePaymentStore();
  const [copiedHash, setCopiedHash] = useState(false);
  const [payment, setPayment] = useState<PaymentDto | null>(currentPayment);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (publicToken) {
      const paymentId = currentPayment?.id || sessionStorage.getItem(`lumora_last_payment_id:${publicToken}`);
      if (paymentId) {
        paymentsApi
          .get(paymentId)
          .then((res) => setPayment(res))
          .catch(() => setPayment(null))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [publicToken, currentPayment]);

  if (loading) {
    return (
      <CheckoutLayout>
        <div className="max-w-xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center font-bold text-on-surface-variant">
          Loading verified payment...
        </div>
      </CheckoutLayout>
    );
  }

  if (!payment || payment.status !== 'CONFIRMED' || !payment.hash) {
    return (
      <CheckoutLayout>
        <div className="max-w-xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center space-y-sm">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">Payment Not Confirmed</h3>
          <p className="text-on-surface-variant text-sm">A verified transaction hash is not available yet.</p>
        </div>
      </CheckoutLayout>
    );
  }

  const handleCopyHash = () => {
    navigator.clipboard.writeText(payment.hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <CheckoutLayout>
      <div className="max-w-xl mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        
        {/* Banner header success */}
        <div className="bg-green-50 border-b border-outline-variant p-md text-center flex flex-col items-center justify-center space-y-xs">
          <CheckCircle className="text-success" size={48} />
          <h3 className="font-headline-md text-headline-md text-success font-black">Payment Successful!</h3>
          <p className="text-on-surface-variant text-xs font-bold font-mono-data">LEDGER INDEX: {payment.ledger}</p>
        </div>

        {/* Content detail */}
        <div className="p-md md:p-lg space-y-md text-sm">
          <div className="text-center space-y-1">
            <span className="text-on-surface-variant font-label-sm text-xs uppercase tracking-wider block">Amount Paid</span>
            <h2 className="font-mono-amount text-primary text-4xl font-bold">{formatAmount(payment.amount)} {payment.asset}</h2>
            <span className="text-[11px] text-[#168a5b] bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full inline-block font-bold">
              Testnet Transaction Confirmed
            </span>
          </div>

          <div className="border-t border-b border-outline-variant/30 py-md space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant font-bold">Merchant Studio:</span>
              <span className="font-bold text-primary">Merchant</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant font-bold">Invoice ID:</span>
              <span className="font-mono-data text-xs font-bold text-primary">{payment.invoiceId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant font-bold">Timestamp:</span>
              <span className="text-primary font-bold">{payment.timestamp}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant font-bold">Gas Fee Paid:</span>
              <span className="font-mono-amount text-xs text-primary">{payment.fee} XLM</span>
            </div>
            <div className="space-y-xs pt-xs border-t border-dashed border-outline-variant/20">
              <span className="text-on-surface-variant font-bold block">Transaction Hash:</span>
              <div className="flex gap-sm items-center w-full bg-surface border border-outline-variant p-sm rounded-lg">
                <span className="font-mono-data text-xs text-primary truncate flex-grow break-all select-all">{payment.hash}</span>
                <button
                  onClick={handleCopyHash}
                  className="p-1 border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary rounded-lg transition-colors"
                >
                  {copiedHash ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Explorer log action link */}
          <div className="flex justify-center pt-xs">
            <a 
              href={payment.explorerUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-secondary font-label-sm text-xs font-bold hover:underline flex items-center gap-1 ${payment.explorerUrl ? '' : 'pointer-events-none opacity-50'}`}
            >
              Verify on Stellar.Expert Explorer <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Action button controls */}
        <div className="bg-surface-container-low p-md border-t border-outline-variant flex flex-col sm:flex-row gap-sm justify-between">
          <button 
            onClick={() => navigate('/')}
            className="w-full sm:w-auto border border-primary text-primary font-label-sm text-xs font-bold h-10 px-md rounded-lg hover:bg-surface-container-low transition-colors"
          >
            Return to Merchant
          </button>
          
          <Link
            to={`/receipt/${payment.id}`}
            className="w-full sm:w-auto bg-primary text-on-primary font-label-sm text-xs font-bold h-10 px-md rounded-lg flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity"
          >
            <Printer size={14} /> View Printable Receipt <ChevronRight size={14} />
          </Link>
        </div>

      </div>
    </CheckoutLayout>
  );
};
export default PaymentSuccess;
