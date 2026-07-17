import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { customersApi } from '../services/api/customers.api';
import { hasAccessToken } from '../services/api/api-client';
import { useWalletStore } from '../stores/wallet.store';
import type { CustomerDto, InvoiceDto } from '../types/api.types';
import { formatAmount, formatDate } from '../utils/format';
import { ArrowLeft, Mail, Wallet, FileText, ArrowRight, Pencil, Trash2, Check, X } from 'lucide-react';

export const CustomerDetail: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { address } = useWalletStore();
  const [customer, setCustomer] = useState<CustomerDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', walletAddress: '', notes: '' });

  const loadCustomer = useCallback(() => {
    if (!customerId) return;
    if (!address || !hasAccessToken()) {
      setCustomer(null);
      setActionError('Connect Freighter to load this customer.');
      setLoading(false);
      return;
    }

    setLoading(true);
    customersApi
      .get(customerId)
      .then((res) => {
        setCustomer(res);
        setForm({
          name: res.name,
          email: res.email || '',
          walletAddress: res.wallet || res.walletAddress || '',
          notes: res.notes || '',
        });
        setActionError(null);
      })
      .catch((err) => setActionError(err instanceof Error ? err.message : 'Failed to load customer'))
      .finally(() => setLoading(false));
  }, [customerId, address]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerId) return;
    if (!address || !hasAccessToken()) {
      setActionError('Connect Freighter before updating this customer.');
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      await customersApi.update(customerId, {
        name: form.name,
        email: form.email || undefined,
        walletAddress: form.walletAddress || undefined,
        notes: form.notes || undefined,
      });
      setEditing(false);
      loadCustomer();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerId || !window.confirm('Delete this customer? Existing invoices remain linked in backend history only if database constraints allow it.')) {
      return;
    }
    if (!address || !hasAccessToken()) {
      setActionError('Connect Freighter before deleting this customer.');
      return;
    }

    setActionError(null);
    try {
      await customersApi.remove(customerId);
      navigate('/app/customers');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg text-center shadow-sm">
          Loading customer...
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg text-center space-y-md shadow-sm">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Customer Not Found</h3>
          <button
            onClick={() => navigate('/app/customers')}
            className="bg-primary text-on-primary font-label-sm text-sm px-md h-10 rounded font-bold hover:opacity-90"
          >
            Back to Customers
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const customerInvoices = customer.invoices || [];

  const getStatusBadge = (invoiceStatus: string) => {
    switch (invoiceStatus) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-xs bg-green-50 text-success px-2 py-0.5 rounded-full font-label-sm text-xs border border-green-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Paid
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-xs bg-blue-50 text-info px-2 py-0.5 rounded-full font-label-sm text-xs border border-blue-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-info"></span> Open
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-xs bg-gray-50 text-mutedGray px-2 py-0.5 rounded-full font-label-sm text-xs border border-gray-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-mutedGray"></span> {invoiceStatus}
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center gap-sm">
        <Link to="/app/customers" className="p-2 border border-outline-variant hover:border-primary rounded-lg text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-on-surface-variant text-sm font-bold">Customer Profile Details</span>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md md:p-lg flex flex-col md:flex-row md:items-center justify-between gap-md shadow-sm">
        <div className="flex items-start gap-md">
          <div className="w-16 h-16 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center text-2xl font-black border border-outline-variant/60 flex-shrink-0">
            {customer.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="space-y-1">
            <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-2">
              {customer.name}
              <span className="text-xs bg-green-50 text-success px-2 py-0.5 rounded border border-green-200 font-bold">Active</span>
            </h3>
            <p className="text-on-surface-variant text-sm flex items-center gap-1">
              <Mail size={14} /> {customer.email}
            </p>
            <p className="font-mono-data text-xs text-mutedGray break-all flex items-center gap-1">
              <Wallet size={14} /> {customer.wallet}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md text-center border-t md:border-t-0 md:border-l border-outline-variant/30 pt-md md:pt-0 md:pl-lg">
          <div className="space-y-xs">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Invoices Issued</span>
            <p className="font-mono-amount text-primary text-2xl font-bold">{customerInvoices.length}</p>
          </div>
          <div className="space-y-xs">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Total Paid</span>
            <p className="font-mono-amount text-success text-2xl font-bold">{formatAmount(customer.totalPaid)} XLM</p>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-error text-error p-md rounded-lg text-sm font-bold">
          {actionError}
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md shadow-sm space-y-md">
        <div className="flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-primary font-bold">Customer Actions</h3>
          <div className="flex gap-sm">
            <button
              onClick={() => setEditing((value) => !value)}
              className="border border-outline-variant text-primary font-label-sm text-xs font-bold px-3 py-2 rounded flex items-center gap-1"
            >
              {editing ? <X size={14} /> : <Pencil size={14} />} {editing ? 'Cancel Edit' : 'Edit'}
            </button>
            <button
              onClick={handleDelete}
              className="border border-error text-error font-label-sm text-xs font-bold px-3 py-2 rounded flex items-center gap-1"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {editing && (
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-sm items-end">
            <div className="space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                required
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Email</label>
              <input
                value={form.email}
                onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                type="email"
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Wallet</label>
              <input
                value={form.walletAddress}
                onChange={(event) => setForm((value) => ({ ...value, walletAddress: event.target.value }))}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono-data outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-on-primary font-label-sm text-xs font-bold h-10 rounded flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Check size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="p-md border-b border-outline-variant bg-surface-container-low/50 flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5">
            <FileText size={18} className="text-secondary" /> Customer Invoices Ledger
          </h3>
          <span className="font-label-sm text-xs text-on-surface-variant font-bold">Total {customerInvoices.length} entries</span>
        </div>

        {customerInvoices.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant text-sm">No invoices have been issued to this customer.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/50 font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">
                <th className="p-md">Invoice ID</th>
                <th className="p-md">Title</th>
                <th className="p-md">Due Date</th>
                <th className="p-md text-right">Amount</th>
                <th className="p-md">Status</th>
                <th className="p-md text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {customerInvoices.map((inv: InvoiceDto) => (
                <tr key={inv.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low/30 transition-colors">
                  <td className="p-md font-mono-data text-mono-data text-primary font-bold">
                    <Link to={`/app/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                  </td>
                  <td className="p-md text-primary font-bold truncate max-w-xs">{inv.title}</td>
                  <td className="p-md text-on-surface-variant">{formatDate(inv.dueDate)}</td>
                  <td className="p-md text-right font-mono-amount font-bold text-primary">{formatAmount(inv.amount)} {inv.asset}</td>
                  <td className="p-md">{getStatusBadge(inv.status)}</td>
                  <td className="p-md text-right">
                    <Link to={`/app/invoices/${inv.id}`} className="text-on-surface-variant hover:text-primary transition-colors p-1 inline-block">
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
};
export default CustomerDetail;
