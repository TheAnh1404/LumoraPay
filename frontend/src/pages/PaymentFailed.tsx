import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CheckoutLayout from '../components/layout/CheckoutLayout';
import { XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { usePaymentStore } from '../stores/payment.store';

export const PaymentFailed: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const navigate = useNavigate();
  const { error } = usePaymentStore();

  const handleRetry = () => {
    navigate(`/pay/${publicToken}`);
  };

  return (
    <CheckoutLayout>
      <div className="max-w-md mx-auto bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        
        {/* Banner header failure */}
        <div className="bg-red-50 border-b border-outline-variant p-md text-center flex flex-col items-center justify-center space-y-xs">
          <XCircle className="text-error" size={48} />
          <h3 className="font-headline-md text-headline-md text-error font-black">Transaction Failed</h3>
          <p className="text-on-surface-variant text-xs font-bold font-mono-data">PAYMENT NOT CONFIRMED</p>
        </div>

        {/* Content detail */}
        <div className="p-md md:p-lg space-y-md text-sm text-center">
          <div className="bg-red-50/20 border border-error/10 p-sm rounded-lg flex gap-sm text-xs font-bold text-error items-start text-left">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <span className="block font-bold">Payment attempt failed</span>
              <span className="block opacity-90 font-normal mt-0.5">
                {error || 'No funds were marked as settled because the backend did not confirm a valid Stellar transaction.'}
              </span>
            </div>
          </div>
          
          <p className="text-on-surface-variant text-xs max-w-sm mx-auto leading-relaxed pt-xs">
            Please make sure Freighter extension is unlocked, connected to the Stellar Testnet, and has sufficient native XLM assets.
          </p>
        </div>

        {/* Action buttons */}
        <div className="bg-surface-container-low p-md border-t border-outline-variant flex gap-sm">
          <button
            onClick={() => navigate('/')}
            className="w-1/2 border border-primary text-primary font-label-sm text-xs font-bold h-12 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1"
          >
            Cancel
          </button>
          
          <button
            onClick={handleRetry}
            className="w-1/2 bg-primary text-on-primary font-label-sm text-xs font-bold h-12 rounded-lg hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 font-bold"
          >
            <RefreshCw size={14} /> Retry Payment
          </button>
        </div>

      </div>
    </CheckoutLayout>
  );
};
export default PaymentFailed;
