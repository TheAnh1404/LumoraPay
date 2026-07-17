import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { customersApi } from '../services/api/customers.api';
import { hasAccessToken } from '../services/api/api-client';
import { useWalletStore } from '../stores/wallet.store';
import type { CustomerDto } from '../types/api.types';
import { formatAmount } from '../utils/format';
import { Users, Search, Plus, ArrowRight, Mail } from 'lucide-react';

export const Customers: React.FC = () => {
  const { address } = useWalletStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', walletAddress: '', notes: '' });

  const loadCustomers = useCallback(() => {
    if (!address || !hasAccessToken()) {
      setCustomers([]);
      setError('Connect Freighter to load customers.');
      setLoading(false);
      return;
    }

    setLoading(true);
    customersApi
      .list()
      .then((res) => {
        setCustomers(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load customers'))
      .finally(() => setLoading(false));
  }, [address]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreateCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!address || !hasAccessToken()) {
      setError('Connect Freighter before creating customers.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await customersApi.create({
        name: newCustomer.name,
        email: newCustomer.email || undefined,
        walletAddress: newCustomer.walletAddress || undefined,
        notes: newCustomer.notes || undefined,
      });
      setNewCustomer({ name: '', email: '', walletAddress: '', notes: '' });
      setShowCreate(false);
      loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setCreating(false);
    }
  };

  const filteredCustomers = customers.filter((cust) =>
    [cust.name, cust.email, cust.wallet].some((value) => value.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-surface-container-lowest border border-outline-variant p-md rounded-lg shadow-sm">
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search customers by name, email, wallet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-colors"
          />
        </div>

        <button
          onClick={() => setShowCreate((show) => !show)}
          className="bg-primary text-on-primary font-label-sm text-sm px-4 py-2.5 rounded hover:opacity-95 transition-all flex items-center gap-1.5 font-bold shadow-sm"
        >
          <Plus size={16} /> {showCreate ? 'Close Form' : 'Create Customer'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateCustomer} className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-4 gap-sm items-end">
          <div className="space-y-xs">
            <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Name</label>
            <input
              value={newCustomer.name}
              onChange={(event) => setNewCustomer((value) => ({ ...value, name: event.target.value }))}
              required
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-xs">
            <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Email</label>
            <input
              value={newCustomer.email}
              onChange={(event) => setNewCustomer((value) => ({ ...value, email: event.target.value }))}
              type="email"
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="space-y-xs">
            <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Wallet</label>
            <input
              value={newCustomer.walletAddress}
              onChange={(event) => setNewCustomer((value) => ({ ...value, walletAddress: event.target.value }))}
              className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm font-mono-data outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-secondary-container text-on-secondary-container font-label-sm text-sm px-4 py-2.5 rounded hover:bg-secondary-fixed-dim transition-all font-bold shadow-sm disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Save Customer'}
          </button>
        </form>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-16 text-on-surface-variant text-sm">Loading customers...</div>
        ) : error ? (
          <div className="text-center py-16 text-error text-sm font-bold">{error}</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16 space-y-sm">
            <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant mx-auto">
              <Users size={20} />
            </div>
            <h3 className="font-headline-md text-headline-md font-bold text-primary">No customers found</h3>
            <p className="text-on-surface-variant text-sm max-w-xs mx-auto">Try adjusting your search query.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/50 font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">
                    <th className="p-md">Customer Name</th>
                    <th className="p-md">Email Address</th>
                    <th className="p-md">Linked Wallet Address</th>
                    <th className="p-md text-center">Invoices</th>
                    <th className="p-md text-right">Total Settled</th>
                    <th className="p-md text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low/30 transition-colors">
                      <td className="p-md font-bold text-primary">
                        <Link to={`/app/customers/${cust.id}`} className="hover:underline flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-xs font-black">
                            {cust.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          {cust.name}
                        </Link>
                      </td>
                      <td className="p-md text-on-surface-variant">{cust.email}</td>
                      <td className="p-md font-mono-data text-xs text-mutedGray truncate max-w-xs">{cust.wallet}</td>
                      <td className="p-md text-center font-mono-data font-bold text-primary">{cust.invoicesCount}</td>
                      <td className="p-md text-right font-mono-amount font-bold text-success">{formatAmount(cust.totalPaid)} XLM</td>
                      <td className="p-md text-right">
                        <Link to={`/app/customers/${cust.id}`} className="text-on-surface-variant hover:text-primary transition-colors p-1 inline-block">
                          <ArrowRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-outline-variant/30">
              {filteredCustomers.map((cust) => (
                <div key={cust.id} className="p-md flex flex-col gap-2 bg-surface-container-lowest">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary text-sm flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-[10px] font-black">
                        {cust.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                      {cust.name}
                    </span>
                    <span className="bg-green-50 text-success text-[10px] px-2 py-0.5 rounded font-bold border border-green-200">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant flex items-center gap-1">
                    <Mail size={12} /> {cust.email}
                  </p>
                  <p className="font-mono-data text-[10px] text-mutedGray truncate">Wallet: {cust.wallet}</p>
                  <div className="flex justify-between items-center border-t border-dashed border-outline-variant/20 pt-2 mt-1 text-xs">
                    <span>
                      Invoices count: <b className="text-primary font-mono-data">{cust.invoicesCount}</b>
                    </span>
                    <div className="flex items-center gap-sm">
                      <span className="font-mono-amount font-bold text-success">{formatAmount(cust.totalPaid)} XLM</span>
                      <Link to={`/app/customers/${cust.id}`} className="text-secondary">
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
export default Customers;
