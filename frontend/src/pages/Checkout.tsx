import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CheckoutLayout from '../components/layout/CheckoutLayout';
import { useInvoiceStore } from '../stores/invoice.store';
import { useWalletStore } from '../stores/wallet.store';
import { usePaymentStore } from '../stores/payment.store';
import { formatAmount, formatDate } from '../utils/format';
import { QRCodeSVG } from 'qrcode.react'; // To render clean dynamic QR codes
import { 
  ShieldCheck, 
  Wallet, 
  AlertTriangle, 
  Info,
  Calendar,
  Copy,
  Check
} from 'lucide-react';
import { getConfiguredStellarNetwork } from '../services/stellar/freighter.service';

function normalizeQrAmount(amount: string) {
  const parsed = Number.parseFloat(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return amount;
  }

  return parsed
    .toFixed(7)
    .replace(/0+$/, '')
    .replace(/\.$/, '');
}

function getCheckoutQrUrl(publicToken?: string) {
  if (typeof window === 'undefined') return '';
  if (!publicToken) return window.location.href;
  return `${window.location.origin}/pay/${publicToken}`;
}

function buildSep7PayUri(invoice: any) {
  const params = new URLSearchParams({
    destination: invoice.destinationWallet,
    amount: normalizeQrAmount(invoice.amount),
    memo: invoice.memo || invoice.invoiceNumber,
    memo_type: 'MEMO_TEXT',
    msg: `Lumora Pay ${invoice.invoiceNumber}`,
    network_passphrase: getConfiguredStellarNetwork().networkPassphrase,
  });

  if (invoice.asset && invoice.asset !== 'XLM') {
    params.set('asset_code', invoice.asset);
  }

  return `web+stellar:pay?${params.toString()}`;
}

export const Checkout: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const navigate = useNavigate();
  const { getInvoiceByPublicToken } = useInvoiceStore();
  const { status: walletStatus, address: walletAddress, balance, network, connect, error: walletError } = useWalletStore();
  const { status: paymentStatus, startPayment } = usePaymentStore();
  
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrMode, setQrMode] = useState<'wallet' | 'link'>('wallet');
  const [copiedQr, setCopiedQr] = useState(false);

  useEffect(() => {
    if (publicToken) {
      getInvoiceByPublicToken(publicToken)
        .then((res) => {
          setInvoice(res);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [publicToken, getInvoiceByPublicToken]);

  if (loading) {
    return (
      <CheckoutLayout>
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg text-center space-y-md shadow-sm">
          <p className="text-on-surface-variant font-bold">Loading invoice details...</p>
        </div>
      </CheckoutLayout>
    );
  }

  if (!invoice) {
    return (
      <CheckoutLayout>
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg text-center space-y-md shadow-sm">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Invoice Not Found</h3>
          <p className="text-on-surface-variant">The checkout link you opened is invalid or has expired.</p>
        </div>
      </CheckoutLayout>
    );
  }

  // Calculate invoice status states
  const isPaid = invoice.status === 'PAID';
  const isCancelled = invoice.status === 'CANCELLED';
  const isExpired = invoice.status === 'EXPIRED';
  const isPayable = invoice.status === 'OPEN';
  const isInactive = !isPayable;
  const isEscrowPayment = invoice.paymentType === 'ESCROW';

  const invoiceAmountNum = parseFloat(invoice.amount) || 0;
  const walletBalanceNum = parseFloat(balance) || 0;
  const hasInsufficientBalance = walletBalanceNum < invoiceAmountNum;
  const isWrongNetwork = walletStatus === 'wrong_network' || network !== 'Stellar Testnet';
  const isPaymentBusy = ['preparing', 'awaiting_signature', 'submitting', 'confirming'].includes(paymentStatus);
  const effectiveQrMode = isEscrowPayment ? 'link' : qrMode;
  const checkoutQrUrl = getCheckoutQrUrl(publicToken);
  const walletQrValue = buildSep7PayUri(invoice);
  const qrValue = effectiveQrMode === 'wallet' ? walletQrValue : checkoutQrUrl;

  const handleCopyQrValue = async () => {
    await navigator.clipboard.writeText(qrValue);
    setCopiedQr(true);
    window.setTimeout(() => setCopiedQr(false), 1600);
  };

  const handlePay = async () => {
    if (!walletAddress || !publicToken) return;
    
    // Redirect to processing view
    navigate(`/pay/${publicToken}/processing`);
    
    // Trigger real checkout
    const result = await startPayment(
      publicToken,
      invoice.amount,
      invoice.asset,
      walletAddress,
      invoice.destinationWallet,
      invoice
    );
    
    if (result) {
      navigate(`/pay/${publicToken}/success`);
    } else {
      navigate(`/pay/${publicToken}/failed`);
    }
  };

  return (
    <CheckoutLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        
        {/* Left Side: Invoice Summary Details */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          {/* Card Header */}
          <div className="bg-surface-container-low p-md border-b border-outline-variant flex justify-between items-start">
            <div className="space-y-xs">
              <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Billing Invoice</span>
              <h3 className="font-headline-md text-headline-md text-primary font-bold">{invoice.title}</h3>
              <span className="font-mono-data text-xs text-on-surface-variant bg-surface px-2 py-0.5 rounded border border-outline-variant">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div>
              {isPaid && (
                <span className="bg-green-50 text-success px-3 py-1 rounded-full font-label-sm text-xs border border-green-200 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span> PAID
                </span>
              )}
              {isCancelled && (
                <span className="bg-red-50 text-error px-3 py-1 rounded-full font-label-sm text-xs border border-red-200 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error"></span> CANCELLED
                </span>
              )}
              {isExpired && (
                <span className="bg-yellow-50 text-warning px-3 py-1 rounded-full font-label-sm text-xs border border-yellow-200 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning"></span> EXPIRED
                </span>
              )}
              {!isInactive && (
                <span className="bg-blue-50 text-info px-3 py-1 rounded-full font-label-sm text-xs border border-blue-200 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-info"></span> ACTIVE
                </span>
              )}
            </div>
          </div>

          {/* Card Body Metadata */}
          <div className="p-md space-y-md border-b border-outline-variant/30 text-sm">
            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-xs">
                <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Merchant Address</span>
                <span className="font-bold text-primary">{invoice.merchantName || 'Merchant'}</span>
                <span className="font-mono-data text-xs text-on-surface-variant break-all block">{invoice.destinationWallet}</span>
              </div>
              <div className="space-y-xs">
                <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider block">Billing Customer</span>
                <span className="font-bold text-primary">{invoice.customerName}</span>
                <span className="text-on-surface-variant text-xs block">{invoice.customerEmail}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant pt-2 border-t border-dashed border-outline-variant/20">
              <Calendar size={14} className="text-secondary" /> Due date: <span className="font-bold text-primary">{formatDate(invoice.dueDate)}</span>
            </div>
          </div>

          {/* Line items Table */}
          <div className="p-md space-y-sm">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold block">Itemized Breakdown</span>
            <div className="border border-outline-variant rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant font-label-sm text-xs text-on-surface-variant uppercase font-bold tracking-wider">
                    <th className="p-sm">Item</th>
                    <th className="p-sm text-center">Qty</th>
                    <th className="p-sm text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-outline-variant/30 last:border-b-0 text-sm">
                      <td className="p-sm font-bold text-primary">{item.name || item.description}</td>
                      <td className="p-sm text-center font-mono-data">{item.quantity}</td>
                      <td className="p-sm text-right font-mono-amount font-bold text-primary">
                        {formatAmount(item.quantity * parseFloat(item.unitPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subtotal Total */}
          <div className="bg-surface-container-low p-md border-t border-outline-variant flex justify-between items-baseline">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Total Bill:</span>
            <span className="font-mono-amount text-primary text-2xl font-bold">{formatAmount(invoice.amount)} {invoice.asset}</span>
          </div>
        </div>

        {/* Right Side: Payment Action Card */}
        <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-lg space-y-md shadow-sm">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">
            {isEscrowPayment ? 'Stellar Escrow Card' : 'Stellar Payment Card'}
          </h3>
          
          <div className="flex flex-col items-center justify-center border border-outline-variant/40 bg-surface-container-low/20 p-sm rounded-xl space-y-sm">
            {!isEscrowPayment && (
              <div className="inline-flex bg-surface border border-outline-variant rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setQrMode('wallet')}
                  className={`h-8 px-3 rounded-md font-label-sm text-xs font-bold transition-colors ${
                    qrMode === 'wallet'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Wallet
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('link')}
                  className={`h-8 px-3 rounded-md font-label-sm text-xs font-bold transition-colors ${
                    qrMode === 'link'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Link
                </button>
              </div>
            )}
            <div className="bg-white p-2 rounded-lg border border-outline-variant/60 shadow-sm">
              <QRCodeSVG
                value={qrValue}
                size={212}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                marginSize={4}
                boostLevel
                title={effectiveQrMode === 'wallet' ? 'Stellar payment QR code' : 'Checkout link QR code'}
                className="block"
              />
            </div>
            <div className="flex items-center gap-xs w-full justify-center">
              <span className="font-mono-data text-[10px] text-on-surface-variant">
                {effectiveQrMode === 'wallet' ? 'SEP-7 Stellar wallet payment' : 'Checkout link'}
              </span>
              <button
                type="button"
                onClick={handleCopyQrValue}
                className="p-1 border border-outline-variant rounded-md text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                title="Copy QR value"
              >
                {copiedQr ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="space-y-sm text-sm border-t border-b border-outline-variant/30 py-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant font-bold">
                {isEscrowPayment ? 'Escrow Amount:' : 'Checkout Amount:'}
              </span>
              <span className="font-mono-amount font-bold text-primary">{formatAmount(invoice.amount)} {invoice.asset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant font-bold">Payment Rail:</span>
              <span className="font-mono-data text-xs text-primary font-bold">
                {isEscrowPayment ? 'Soroban Escrow' : 'Classic Payment'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant font-bold">Target Network:</span>
              <span className="font-mono-data text-xs text-secondary font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span> Stellar Testnet
              </span>
            </div>
            {walletStatus === 'connected' && walletAddress && (
              <>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-bold">Network Gas Fee:</span>
                  <span className="font-mono-amount text-xs text-success font-bold">0.00001 XLM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-bold">Wallet Address:</span>
                  <span className="font-mono-data text-xs font-bold text-primary break-all ml-4 text-right">
                    {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-bold">Wallet Balance:</span>
                  <span className={`font-mono-amount font-bold ${hasInsufficientBalance ? 'text-error' : 'text-primary'}`}>
                    {formatAmount(balance)} XLM
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action Trigger Buttons */}
          {walletError && walletStatus === 'connected' && (
            <div className="bg-yellow-50 border border-warning/20 text-warning p-sm rounded-lg flex gap-sm text-xs font-bold items-start">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{walletError}</span>
            </div>
          )}

          {isInactive ? (
            <div className="bg-red-50 border border-error/20 p-sm rounded-lg text-center font-bold text-error text-sm">
              This invoice status is {invoice.status} and cannot accept a payment.
            </div>
          ) : isWrongNetwork ? (
            <div className="space-y-sm">
              <div className="bg-red-50 border border-error/20 text-error p-sm rounded-lg flex gap-sm text-xs font-bold items-start">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>Wrong Network selected in Freighter Wallet. Please switch network settings to Testnet.</span>
              </div>
              <button
                onClick={connect}
                disabled={walletStatus === 'connecting'}
                className="w-full bg-primary text-on-primary h-12 rounded-lg font-label-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60"
              >
                <Wallet size={16} /> Recheck Freighter Network
              </button>
            </div>
          ) : walletStatus !== 'connected' ? (
            <div className="space-y-sm">
              <button
                onClick={connect}
                disabled={walletStatus === 'connecting'}
                className="w-full bg-primary text-on-primary h-12 rounded-lg font-label-sm font-bold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-60"
              >
                <Wallet size={16} /> {walletStatus === 'connecting' ? 'Waiting for Freighter...' : 'Connect Freighter Wallet'}
              </button>
              {walletError && (
                <div className="bg-red-50 border border-error/20 text-error p-sm rounded-lg flex gap-sm text-xs font-bold items-start">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{walletError}</span>
                </div>
              )}
            </div>
          ) : hasInsufficientBalance ? (
            <div className="space-y-sm">
              <div className="bg-red-50 border border-error/20 text-error p-sm rounded-lg flex gap-sm text-xs font-bold items-start">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>Insufficient funds. You need at least {formatAmount(invoiceAmountNum + 0.00001)} XLM.</span>
              </div>
              <button
                disabled
                className="w-full bg-[#eeeae0] text-[#737373] h-12 rounded-lg font-label-sm font-bold border border-[#d8d4ca] cursor-not-allowed"
              >
                Insufficient XLM Balance
              </button>
            </div>
          ) : (
            <button
              onClick={handlePay}
              disabled={isPaymentBusy}
              className="w-full bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim transition-colors h-12 rounded-lg font-label-sm font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <ShieldCheck size={18} /> {isPaymentBusy ? 'Payment in progress...' : `${isEscrowPayment ? 'Fund escrow' : 'Pay'} ${formatAmount(invoice.amount)} XLM`}
            </button>
          )}

          {/* Secure details notification */}
          <div className="flex gap-sm text-[11px] text-on-surface-variant leading-relaxed">
            <Info size={16} className="text-secondary mt-0.5 flex-shrink-0" />
            <span>
              {isEscrowPayment
                ? "Funds are deposited from your Freighter Wallet into the Payment Escrow contract. Lumora Pay never holds your keys."
                : "Funds are sent directly from your Freighter Wallet to the merchant's Stellar address. Lumora Pay never holds your keys or assets."}
            </span>
          </div>

        </div>
      </div>
    </CheckoutLayout>
  );
};
export default Checkout;
