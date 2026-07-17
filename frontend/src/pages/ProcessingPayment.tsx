import React, { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import CheckoutLayout from '../components/layout/CheckoutLayout';
import { usePaymentStore } from '../stores/payment.store';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export const ProcessingPayment: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const navigate = useNavigate();
  const { status, currentPayment, recoverPayment } = usePaymentStore();
  const [noAttempt, setNoAttempt] = React.useState(false);

  useEffect(() => {
    if (!publicToken || status !== 'idle') return;

    recoverPayment(publicToken).then((payment) => {
      if (!payment && usePaymentStore.getState().status === 'idle') {
        setNoAttempt(true);
      }
    });
  }, [publicToken, status, recoverPayment]);

  useEffect(() => {
    // If it reaches success or failed, route automatically
    if (status === 'success' && currentPayment) {
      navigate(`/pay/${publicToken}/success`);
    } else if (status === 'failed') {
      navigate(`/pay/${publicToken}/failed`);
    }
  }, [status, currentPayment, publicToken, navigate]);

  const steps = [
    { label: 'Preparing transaction parameters', key: 'preparing' },
    { label: 'Awaiting signature from Freighter Wallet extension', key: 'awaiting_signature' },
    { label: 'Submitting transaction envelope to the Stellar network', key: 'submitting' },
    { label: 'Confirming ledger block state hashes validation', key: 'confirming' },
    { label: 'Updating billing ledger status logs', key: 'confirming' }
  ];

  const getStepStatus = (index: number) => {
    // Current step indexes:
    // preparing = 0, awaiting_signature = 1, submitting = 2, confirming = 3/4
    let activeIndex = -1;
    if (status === 'preparing') activeIndex = 0;
    else if (status === 'awaiting_signature') activeIndex = 1;
    else if (status === 'submitting') activeIndex = 2;
    else if (status === 'confirming') activeIndex = 3; // for confirming and updating, index 3 and 4 are close.
    else if (status === 'success') activeIndex = 5;

    if (index < activeIndex) {
      return 'completed';
    } else if (index === activeIndex || (status === 'confirming' && index === 4)) {
      return 'active';
    } else {
      return 'pending';
    }
  };

  if (noAttempt) {
    return (
      <CheckoutLayout>
        <div className="max-w-md mx-auto bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl shadow-sm space-y-md text-center">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">No Active Payment</h3>
          <p className="text-on-surface-variant text-sm">No pending payment intent was found for this checkout session.</p>
          <Link
            to={`/pay/${publicToken}`}
            className="inline-flex items-center justify-center bg-primary text-on-primary h-10 px-md rounded-lg font-label-sm font-bold text-xs"
          >
            Return to Checkout
          </Link>
        </div>
      </CheckoutLayout>
    );
  }

  return (
    <CheckoutLayout>
      <div className="max-w-md mx-auto bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl shadow-sm space-y-lg text-center">
        
        {/* Loading Spinner */}
        <div className="flex flex-col items-center justify-center space-y-md py-md">
          <Loader2 className="animate-spin text-secondary" size={48} />
          <div className="space-y-xs">
            <h3 className="font-headline-md text-headline-md text-primary font-bold">Processing Stellar Payment</h3>
            <p className="text-on-surface-variant text-sm">Please do not close this browser tab or navigate away. Signing transaction envelope...</p>
          </div>
        </div>

        {/* Steps Visual Tracker */}
        <div className="text-left space-y-md border-t border-outline-variant/30 pt-md">
          {steps.map((step, idx) => {
            const stepState = getStepStatus(idx);
            return (
              <div key={idx} className="flex items-center gap-sm">
                <div className="flex-shrink-0">
                  {stepState === 'completed' && (
                    <span className="w-6 h-6 bg-success rounded-full flex items-center justify-center text-white border border-success">
                      <Check size={12} />
                    </span>
                  )}
                  {stepState === 'active' && (
                    <span className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin flex-shrink-0"></span>
                  )}
                  {stepState === 'pending' && (
                    <span className="w-6 h-6 bg-surface border border-outline-variant text-on-surface-variant rounded-full flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                  )}
                </div>
                <span className={`text-sm ${
                  stepState === 'completed' ? 'text-on-surface-variant line-through opacity-60' :
                  stepState === 'active' ? 'text-primary font-bold' : 'text-mutedGray'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Testnet warning */}
        <div className="bg-[#eeeae0] text-on-surface-variant p-sm rounded-lg text-xs leading-relaxed text-left border border-outline-variant/60 flex gap-sm">
          <AlertCircle size={18} className="text-secondary mt-0.5 flex-shrink-0" />
          <span>
            You are operating on the Stellar Testnet. Freighter will ask you to review and sign the unsigned transaction built by Lumora Pay.
          </span>
        </div>

      </div>
    </CheckoutLayout>
  );
};
export default ProcessingPayment;
