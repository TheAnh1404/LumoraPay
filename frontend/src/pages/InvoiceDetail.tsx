import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useInvoiceStore } from '../stores/invoice.store';
import { useWalletStore } from '../stores/wallet.store';
import { formatAmount, formatDate } from '../utils/format';
import { refundsApi } from '../services/api/refunds.api';
import { escrowsApi } from '../services/api/escrows.api';
import { freighterService } from '../services/stellar/freighter.service';
import { getTransactionExplorerUrl } from '../services/stellar/explorer.service';
import { analyticsService } from '../services/analytics.service';
import type { PaymentDto } from '../types/api.types';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2, 
  RotateCcw, 
  Calendar,
  Send
} from 'lucide-react';

export const InvoiceDetail: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { getInvoice, cancelInvoice, openInvoice, duplicateInvoice } = useInvoiceStore();
  const { address: walletAddress } = useWalletStore();
  const [copied, setCopied] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [escrowActionLoading, setEscrowActionLoading] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      setLoading(true);
      getInvoice(invoiceId)
        .then((res) => {
          setInvoice(res);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [invoiceId, getInvoice]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg text-center space-y-md shadow-sm">
          <p className="text-on-surface-variant font-bold">Loading invoice details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg text-center space-y-md shadow-sm">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Invoice Not Found</h3>
          <p className="text-on-surface-variant">The invoice with ID "{invoiceId}" does not exist in our system database records.</p>
          <button 
            onClick={() => navigate('/app/invoices')}
            className="bg-primary text-on-primary font-label-sm text-sm px-md h-10 rounded font-bold hover:opacity-90"
          >
            Back to Invoices
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const checkoutUrl = `${window.location.origin}/pay/${invoice.publicToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelInvoice = async () => {
    try {
      setActionError(null);
      await cancelInvoice(invoice.id);
      const updated = await getInvoice(invoiceId || '');
      setInvoice(updated);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to cancel invoice');
    }
  };

  const handleOpenInvoice = async () => {
    try {
      setActionError(null);
      const opened = await openInvoice(invoice.id);
      setInvoice(opened);
      setActionMessage('Invoice opened and public checkout link is active.');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to open invoice');
    }
  };

  const handleDuplicateInvoice = async () => {
    try {
      setActionError(null);
      const duplicated = await duplicateInvoice(invoice.id);
      navigate(`/app/invoices/${duplicated.id}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to duplicate invoice');
    }
  };

  const confirmedPayment = invoice.payments?.find((payment: PaymentDto) => payment.status === 'CONFIRMED');

  const handleEscrowRefund = async () => {
    if (!invoice.escrow?.id) {
      setActionError('No escrow record is available for this invoice.');
      return;
    }
    if (!walletAddress) {
      setActionError('Connect the merchant Freighter wallet before signing escrow refund.');
      return;
    }

    setEscrowActionLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const prepared = await escrowsApi.prepareRefund(invoice.escrow.id, walletAddress);
      const signedXdr = await freighterService.signSorobanTransaction(prepared.unsignedXdr, walletAddress);
      analyticsService.trackWalletInteraction('SOROBAN_XDR_SIGNED', {
        walletAddress,
        network: prepared.network,
        entityType: 'escrow',
        entityId: invoice.escrow.id,
        metadata: { functionName: 'refund', invoiceId: invoice.id },
      });
      const submitted = await escrowsApi.submitRefund(invoice.escrow.id, signedXdr, walletAddress);
      analyticsService.trackWalletInteraction('ESCROW_ACTION_SUBMITTED', {
        walletAddress,
        network: prepared.network,
        entityType: 'escrow',
        entityId: invoice.escrow.id,
        transactionHash: submitted.transactionHash,
        metadata: { functionName: 'refund', invoiceId: invoice.id },
      });
      const updated = await getInvoice(invoiceId || '');
      setInvoice(updated);
      setActionMessage(
        submitted.transactionHash
          ? `Escrow refund confirmed on Stellar: ${submitted.transactionHash}`
          : 'Escrow refund confirmed by backend.',
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Escrow refund failed');
    } finally {
      setEscrowActionLoading(false);
    }
  };

  const handleRefundInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!confirmedPayment) {
      setActionError('No confirmed payment is available to refund.');
      return;
    }

    setRefundLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const prepared = await refundsApi.prepare(confirmedPayment.id, {
        amount: refundAmount,
        reason: refundReason,
      });
      const signedXdr = await freighterService.signClassicTransaction(prepared.unsignedXdr, walletAddress || undefined);
      if (walletAddress) {
        analyticsService.trackWalletInteraction('REFUND_XDR_SIGNED', {
          walletAddress,
          entityType: 'refund',
          entityId: prepared.id,
          metadata: { paymentId: confirmedPayment.id, invoiceId: invoice.id },
        });
      }
      const submitted = await refundsApi.submit(prepared.id, signedXdr);
      if (walletAddress) {
        analyticsService.trackWalletInteraction('PAYMENT_SUBMITTED', {
          walletAddress,
          entityType: 'refund',
          entityId: prepared.id,
          transactionHash: submitted.transactionHash,
          metadata: { paymentId: confirmedPayment.id, invoiceId: invoice.id },
        });
      }
      const updated = await getInvoice(invoiceId || '');
      setInvoice(updated);
      setRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
      setActionMessage(
        submitted.transactionHash
          ? `Refund confirmed on Stellar: ${submitted.transactionHash}`
          : 'Refund submitted and confirmed by backend.',
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setRefundLoading(false);
    }
  };

  const getStatusBadge = (invoiceStatus: string) => {
    switch (invoiceStatus) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-xs bg-green-50 text-success px-3 py-1 rounded-full font-label-sm text-sm border border-green-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-success"></span> Paid
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-xs bg-blue-50 text-info px-3 py-1 rounded-full font-label-sm text-sm border border-blue-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-info"></span> Open
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-xs bg-yellow-50 text-warning px-3 py-1 rounded-full font-label-sm text-sm border border-yellow-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-warning"></span> Draft
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-xs bg-red-50 text-error px-3 py-1 rounded-full font-label-sm text-sm border border-red-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-error"></span> {invoiceStatus}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-xs bg-gray-50 text-mutedGray px-3 py-1 rounded-full font-label-sm text-sm border border-gray-200 font-bold">
            <span className="w-2 h-2 rounded-full bg-mutedGray"></span> {invoiceStatus}
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      {/* Header back button */}
      <div className="flex items-center gap-sm">
        <Link to="/app/invoices" className="p-2 border border-outline-variant hover:border-primary rounded-lg text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-on-surface-variant text-sm font-bold font-mono-data">{invoice.invoiceNumber}</span>
      </div>

      {/* Invoice Overview Main Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        {(actionError || actionMessage) && (
          <div className={`p-sm border-b font-bold text-sm ${
            actionError ? 'bg-red-50 border-error/20 text-error' : 'bg-green-50 border-success/20 text-success'
          }`}>
            {actionError || actionMessage}
          </div>
        )}

        {/* Header Summary */}
        <div className="bg-surface-container-low p-md md:p-lg border-b border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div className="space-y-xs">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Invoice Title</span>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">{invoice.title}</h3>
            <p className="text-on-surface-variant text-sm">{invoice.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(invoice.status)}
            <span className="font-mono-amount text-mono-amount text-primary text-2xl font-bold">{formatAmount(invoice.amount)} {invoice.asset}</span>
          </div>
        </div>

        {/* Invoice Body Metadata */}
        <div className="p-md md:p-lg grid grid-cols-1 md:grid-cols-3 gap-lg border-b border-outline-variant/30">
          <div className="space-y-xs">
            <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Merchant Destination Wallet</h4>
            <p className="font-mono-data text-xs text-primary break-all font-bold">{invoice.destinationWallet}</p>
          </div>

          <div className="space-y-xs">
            <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Billing Customer</h4>
            <p className="font-bold text-primary">{invoice.customerName}</p>
            <p className="text-on-surface-variant text-sm">{invoice.customerEmail}</p>
            {invoice.customerWallet && (
              <p className="font-mono-data text-xs text-on-surface-variant break-all font-bold">Wallet: {invoice.customerWallet}</p>
            )}
          </div>

          <div className="space-y-xs">
            <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Invoicing Metadata</h4>
            <div className="space-y-1 text-sm text-primary">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Created Date:</span>
                <span className="font-bold">{formatDate(invoice.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Due Date:</span>
                <span className="font-bold">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Transaction Memo:</span>
                <span className="font-mono-data font-bold">{invoice.memo || 'None'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Line Items */}
        <div className="p-md md:p-lg border-b border-outline-variant/30 space-y-sm">
          <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold block">Itemized Breakdown</span>
          <div className="border border-outline-variant rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant font-label-sm text-xs text-on-surface-variant uppercase font-bold tracking-wider">
                  <th className="p-sm">Item</th>
                  <th className="p-sm text-center">Qty</th>
                  <th className="p-sm text-right">Unit Price</th>
                  <th className="p-sm text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-outline-variant/30 last:border-b-0 text-sm">
                    <td className="p-sm font-bold text-primary">{item.name || item.description}</td>
                    <td className="p-sm text-center font-mono-data">{item.quantity}</td>
                    <td className="p-sm text-right font-mono-amount">{formatAmount(item.unitPrice)}</td>
                    <td className="p-sm text-right font-mono-amount font-bold text-primary">
                      {formatAmount(item.quantity * parseFloat(item.unitPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Checkout Link Panel */}
        <div className="p-md md:p-lg bg-surface-container-low/40 flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-outline-variant/30">
          <div className="space-y-1">
            <h4 className="font-bold text-primary text-sm flex items-center gap-1.5">
              <Send size={16} className="text-secondary" /> Customer Checkout Payment Link
            </h4>
            <p className="text-on-surface-variant text-xs">Share this secure checkout URL with your client to accept XLM payment immediately.</p>
          </div>
          
          <div className="flex items-center gap-sm w-full md:w-auto">
            <input 
              type="text" 
              readOnly 
              value={checkoutUrl}
              className="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono-data w-full md:w-[280px] outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="bg-primary text-on-primary p-2.5 rounded-lg hover:bg-on-surface-variant transition-all flex items-center justify-center flex-shrink-0"
              title="Copy checkout URL"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <Link
              to={`/pay/${invoice.publicToken}`}
              className="bg-secondary-container text-on-secondary-container p-2.5 rounded-lg hover:bg-secondary-fixed-dim transition-colors flex items-center justify-center flex-shrink-0"
              title="Open Payment Checkout"
            >
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>

        {invoice.paymentType === 'ESCROW' && (
          <div className="p-md md:p-lg border-b border-outline-variant/30 bg-blue-50/30 space-y-md">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-md">
              <div className="space-y-xs min-w-0">
                <h4 className="font-bold text-primary text-sm flex items-center gap-1.5">
                  <Send size={16} className="text-secondary" /> Payment Escrow Contract
                </h4>
                <p className="text-on-surface-variant text-xs">
                  Customer funds are held by Soroban escrow until payer release, merchant refund, dispute, or admin resolution.
                </p>
              </div>
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-outline-variant bg-surface text-primary font-label-sm text-xs font-bold">
                {invoice.escrow?.status || 'NOT_FUNDED'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm text-xs">
              <div className="space-y-1">
                <span className="text-on-surface-variant font-bold uppercase tracking-wider block">Contract ID</span>
                <span className="font-mono-data text-primary break-all">{invoice.escrow?.contractId || 'Configured at checkout'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-on-surface-variant font-bold uppercase tracking-wider block">On-chain Escrow ID</span>
                <span className="font-mono-data text-primary break-all">{invoice.escrow?.onChainEscrowId || 'Pending payer wallet'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-on-surface-variant font-bold uppercase tracking-wider block">Payer Wallet</span>
                <span className="font-mono-data text-primary break-all">{invoice.escrow?.payerWallet || invoice.customerWallet || 'Waiting for checkout'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-on-surface-variant font-bold uppercase tracking-wider block">Release Deadline</span>
                <span className="font-bold text-primary">{invoice.escrow?.releaseDeadline ? formatDate(invoice.escrow.releaseDeadline) : formatDate(invoice.dueDate)}</span>
              </div>
            </div>

            {(invoice.escrow?.fundedTxHash || invoice.escrow?.releaseTxHash || invoice.escrow?.refundTxHash) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-sm text-xs border-t border-outline-variant/30 pt-sm">
                {(['fundedTxHash', 'releaseTxHash', 'refundTxHash'] as const).map((key) => {
                  const hash = invoice.escrow?.[key];
                  const label = key === 'fundedTxHash' ? 'Funded Tx' : key === 'releaseTxHash' ? 'Release Tx' : 'Refund Tx';
                  return (
                    <div key={key} className="space-y-1">
                      <span className="text-on-surface-variant font-bold uppercase tracking-wider block">{label}</span>
                      <span className="font-mono-data text-primary break-all">{hash || 'None'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {invoice.escrow?.status === 'FUNDED' && (
              <div className="flex flex-wrap gap-sm pt-xs">
                <button
                  onClick={handleEscrowRefund}
                  disabled={escrowActionLoading}
                  className="border border-error text-error hover:bg-red-50 font-label-sm text-xs font-bold px-md py-2.5 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={14} /> {escrowActionLoading ? 'Signing Escrow Refund...' : 'Refund Escrow'}
                </button>
                <p className="text-[11px] text-on-surface-variant flex items-center">
                  Before the release deadline, Freighter must sign from the merchant wallet. After the deadline, payer refund is enforced by the contract.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions bar */}
        <div className="p-md md:p-lg flex flex-wrap justify-between items-center gap-md">
          <div className="flex flex-wrap gap-sm">
            {invoice.status === 'DRAFT' && (
              <button
                onClick={handleOpenInvoice}
                className="border border-secondary text-secondary hover:bg-secondary-container/20 font-label-sm text-xs font-bold px-md py-2.5 rounded flex items-center gap-1.5 transition-colors"
              >
                <Send size={14} /> Open Invoice
              </button>
            )}
            {invoice.status === 'OPEN' && (
              <button
                onClick={handleCancelInvoice}
                className="border border-error text-error hover:bg-red-50 font-label-sm text-xs font-bold px-md py-2.5 rounded flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} /> Cancel Invoice
              </button>
            )}
            {invoice.status === 'PAID' && (
              <button
                onClick={() => {
                  setRefundOpen((open) => !open);
                  setRefundAmount(invoice.amount);
                  setRefundReason('Merchant refund');
                }}
                disabled={!confirmedPayment}
                className="border border-outline hover:border-primary text-primary font-label-sm text-xs font-bold px-md py-2.5 rounded flex items-center gap-1.5 transition-all"
              >
                <RotateCcw size={14} /> Refund Invoice
              </button>
            )}
            <button
              onClick={handleDuplicateInvoice}
              className="border border-outline hover:border-primary text-primary font-label-sm text-xs font-bold px-md py-2.5 rounded flex items-center gap-1.5 transition-all"
            >
              <Copy size={14} /> Duplicate
            </button>
          </div>

          <div className="text-xs text-on-surface-variant flex items-center gap-1 font-bold">
            <Calendar size={14} className="text-secondary" /> 
            Created on {formatDate(invoice.createdAt)}
          </div>
        </div>

        {refundOpen && (
          <form onSubmit={handleRefundInvoice} className="p-md md:p-lg border-t border-outline-variant/30 bg-surface-container-low/30 grid grid-cols-1 md:grid-cols-12 gap-sm items-end">
            <div className="md:col-span-3 space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Refund Amount</label>
              <input
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                required
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono-amount outline-none"
              />
            </div>
            <div className="md:col-span-6 space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Reason</label>
              <input
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                required
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={refundLoading}
              className="md:col-span-3 bg-primary text-on-primary font-label-sm text-xs font-bold h-10 rounded-lg disabled:opacity-50"
            >
              {refundLoading ? 'Signing Refund...' : 'Prepare & Sign Refund'}
            </button>
            <p className="md:col-span-12 text-[11px] text-on-surface-variant">
              Backend builds the refund XDR from the confirmed payment. Freighter must sign from the merchant settlement wallet before Horizon submission.
            </p>
          </form>
        )}
      </div>

      {invoice.payments?.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md md:p-lg shadow-sm space-y-md">
          <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold pb-xs border-b border-outline-variant/30">
            Verified Payment Records
          </h4>
          <div className="space-y-sm">
            {invoice.payments.map((payment: PaymentDto) => {
              const explorerUrl = payment.explorerUrl || getTransactionExplorerUrl('TESTNET', payment.hash);
              return (
                <div key={payment.id} className="border border-outline-variant rounded-lg p-sm flex flex-col md:flex-row md:items-center justify-between gap-sm">
                  <div className="space-y-1">
                    <p className="font-bold text-primary text-sm">{payment.status} - {formatAmount(payment.amount)} {payment.asset}</p>
                    <p className="font-mono-data text-[11px] text-on-surface-variant break-all">
                      {payment.hash || 'Transaction hash not available yet'}
                    </p>
                  </div>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary font-label-sm text-xs font-bold hover:underline inline-flex items-center gap-1"
                    >
                      Stellar Expert <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoice Timeline Process */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md md:p-lg shadow-sm space-y-md">
        <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold pb-xs border-b border-outline-variant/30">Invoice Status History Timeline</h4>
        <div className="relative pl-6 space-y-lg border-l border-outline-variant/60 ml-2">
          {/* Node 1: Created */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-success border-4 border-white flex items-center justify-center"></span>
            <div className="space-y-1">
              <h5 className="font-bold text-primary text-sm flex items-center gap-1">
                Invoice Draft Created <span className="bg-green-50 text-success text-[10px] px-1.5 py-0.2 rounded border border-green-200">System Log</span>
              </h5>
              <p className="text-on-surface-variant text-xs">Publishing metadata into local database collection. Ledger target selected: Stellar Testnet.</p>
              <span className="text-[10px] text-mutedGray">{formatDate(invoice.createdAt)}</span>
            </div>
          </div>

          {/* Node 2: Published / Sent */}
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-success border-4 border-white flex items-center justify-center"></span>
            <div className="space-y-1">
              <h5 className="font-bold text-primary text-sm">Invoice Published & Payment link generated</h5>
              <p className="text-on-surface-variant text-xs">Payment link generated from the backend public token.</p>
              <span className="text-[10px] text-mutedGray">{formatDate(invoice.createdAt)}</span>
            </div>
          </div>

          {/* Node 3: Paid */}
          <div className="relative">
            <span className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-4 border-white flex items-center justify-center ${
              invoice.status === 'PAID' ? 'bg-success' : 'bg-outline-variant'
            }`}></span>
            <div className="space-y-1">
              <h5 className={`font-bold text-sm ${invoice.status === 'PAID' ? 'text-primary' : 'text-on-surface-variant'}`}>
                Payment Received & Stellar receipt issued
              </h5>
              {invoice.status === 'PAID' ? (
                <>
                  <p className="text-on-surface-variant text-xs">Client completed checkout. Backend verified the Stellar transaction before marking this invoice paid.</p>
                  <span className="text-[10px] text-mutedGray">{formatDate(invoice.paidAt || invoice.dueDate)}</span>
                </>
              ) : (
                <p className="text-mutedGray text-xs italic">Awaiting client payment signature checkout.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
export default InvoiceDetail;
