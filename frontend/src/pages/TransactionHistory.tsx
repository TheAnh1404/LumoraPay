import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useWalletStore } from '../stores/wallet.store';
import { formatAmount, truncateAddress } from '../utils/format';
import { History, ExternalLink } from 'lucide-react';
import { walletsApi } from '../services/api/wallets.api';
import type { WalletTransactionDto } from '../types/api.types';

export const TransactionHistory: React.FC = () => {
  const { address } = useWalletStore();
  const [transactions, setTransactions] = useState<WalletTransactionDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    walletsApi
      .transactions(address)
      .then((res) => setTransactions(res))
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <DashboardLayout>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="p-md border-b border-outline-variant bg-surface-container-low/50 flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5">
            <History size={18} className="text-secondary" /> Connected Wallet Ledger History
          </h3>
          <span className="font-label-sm text-xs text-on-surface-variant font-bold font-mono-data">
            ADDRESS: {address ? truncateAddress(address) : 'None'}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-on-surface-variant text-sm">
            Loading wallet transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant text-sm">
            No transactions found for this address.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/50 font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">
                  <th className="p-md">Ledger Hash</th>
                  <th className="p-md">Type</th>
                  <th className="p-md">From/To</th>
                  <th className="p-md text-right">Amount</th>
                  <th className="p-md text-center">Fee</th>
                  <th className="p-md text-center">Block</th>
                  <th className="p-md">Timestamp</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {transactions.map(p => {
                  const isSent = p.fromWallet === address;
                  return (
                    <tr key={p.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low/30 transition-colors">
                      <td className="p-md font-mono-data text-xs text-primary font-bold truncate max-w-[120px]" title={p.hash}>
                        {p.hash ? `${p.hash.substring(0, 12)}...` : 'Pending'}
                      </td>
                      <td className="p-md">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          isSent ? 'bg-red-50 text-error border border-red-200' : 'bg-green-50 text-success border border-green-200'
                        }`}>
                          {isSent ? 'Sent' : 'Received'}
                        </span>
                      </td>
                      <td className="p-md font-mono-data text-xs text-mutedGray">
                        {isSent ? `To: ${truncateAddress(p.toWallet)}` : `From: ${truncateAddress(p.fromWallet)}`}
                      </td>
                      <td className={`p-md text-right font-mono-amount font-bold ${isSent ? 'text-error' : 'text-success'}`}>
                        {isSent ? '-' : '+'}{formatAmount(p.amount || 0)} {p.asset || 'XLM'}
                      </td>
                      <td className="p-md text-center font-mono-amount text-xs text-on-surface-variant">{p.fee || '-'}</td>
                      <td className="p-md text-center font-mono-data text-xs text-secondary font-bold">
                        <a 
                          href={p.explorerUrl || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline inline-flex items-center gap-0.5"
                        >
                          {p.ledger || '-'} <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="p-md text-on-surface-variant text-xs">{p.timestamp || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
export default TransactionHistory;
