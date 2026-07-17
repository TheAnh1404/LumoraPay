import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useInvoiceStore } from '../stores/invoice.store';
import { formatAmount, formatDate } from '../utils/format';

import { 
  Search, 
  Plus, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

export const InvoiceList: React.FC = () => {
  const navigate = useNavigate();
  const { invoices, fetchInvoices } = useInvoiceStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setIsLoading(true);
    fetchInvoices().catch(() => undefined).finally(() => setIsLoading(false));
  }, [fetchInvoices]);

  const handleSimulateLoading = () => {
    setIsLoading(true);
    fetchInvoices().catch(() => undefined).finally(() => setIsLoading(false));
  };

  const getStatusBadge = (invoiceStatus: string) => {
    switch (invoiceStatus) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-xs bg-green-50 text-success px-2.5 py-1 rounded-full font-label-sm text-xs border border-green-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Paid
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-xs bg-blue-50 text-info px-2.5 py-1 rounded-full font-label-sm text-xs border border-blue-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-info"></span> Open
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-xs bg-yellow-50 text-warning px-2.5 py-1 rounded-full font-label-sm text-xs border border-yellow-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Draft
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-xs bg-red-50 text-error px-2.5 py-1 rounded-full font-label-sm text-xs border border-red-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span> {invoiceStatus}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-xs bg-gray-50 text-mutedGray px-2.5 py-1 rounded-full font-label-sm text-xs border border-gray-200 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-mutedGray"></span> {invoiceStatus}
          </span>
        );
    }
  };

  // Filtering logic
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleExportCSV = () => {
    const headers = ['Invoice ID', 'Title', 'Client Name', 'Email', 'Amount', 'Asset', 'Status', 'Due Date', 'Created Date'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      `"${inv.title.replace(/"/g, '""')}"`,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      inv.customerEmail,
      inv.amount,
      inv.asset,
      inv.status,
      inv.dueDate,
      inv.createdAt
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lumora_pay_invoices_${statusFilter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-surface-container-lowest border border-outline-variant p-md rounded-lg shadow-sm">
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search invoice number, client, title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-colors"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-sm">
          <button 
            onClick={handleSimulateLoading}
            className="p-2 border border-outline-variant hover:border-primary rounded-lg text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Reload data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Reload
          </button>
          
          <button 
            onClick={handleExportCSV}
            disabled={filteredInvoices.length === 0}
            className="p-2 border border-outline-variant hover:border-primary rounded-lg text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
          >
            <Download size={14} />
            Export CSV
          </button>
          
          <button 
            onClick={() => navigate('/app/invoices/create')}
            className="bg-primary text-on-primary font-label-sm text-sm px-4 py-2.5 rounded hover:opacity-95 transition-all flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Plus size={16} />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap gap-xs items-center">
        <span className="text-xs text-on-surface-variant font-bold flex items-center gap-1 mr-2">
          <Filter size={12} /> Status:
        </span>
        {['ALL', 'OPEN', 'PAID', 'DRAFT', 'EXPIRED', 'CANCELLED', 'REFUNDED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
              statusFilter === status 
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface hover:bg-surface-container border-outline-variant text-on-surface-variant'
            }`}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm min-h-[300px] flex flex-col justify-between">
        {isLoading ? (
          /* Loading Skeletons */
          <div className="p-md space-y-md animate-pulse">
            <div className="h-8 bg-surface-container rounded w-1/3"></div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center py-sm border-b border-outline-variant/30">
                <div className="space-y-2 w-1/4">
                  <div className="h-4 bg-surface-container rounded"></div>
                  <div className="h-3 bg-surface-container rounded w-3/4"></div>
                </div>
                <div className="h-4 bg-surface-container rounded w-12"></div>
                <div className="h-4 bg-surface-container rounded w-20"></div>
                <div className="h-6 bg-surface-container rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 space-y-sm">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant mb-2 border border-outline-variant">
              <FolderOpen size={28} />
            </div>
            <h3 className="font-headline-md text-headline-md font-bold text-primary">No invoices found</h3>
            <p className="text-on-surface-variant max-w-sm text-sm">
              We couldn't find any invoices matching your search term "{searchTerm}" or filter. Try adjusting your settings or create a new invoice.
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
              className="mt-2 text-secondary font-bold hover:underline font-label-sm text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Real Data Table */
          <>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/50 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-xs">
                    <th className="p-md font-normal">Invoice ID</th>
                    <th className="p-md font-normal">Title</th>
                    <th className="p-md font-normal">Client</th>
                    <th className="p-md font-normal">Due Date</th>
                    <th className="p-md font-normal">Amount</th>
                    <th className="p-md font-normal">Status</th>
                    <th className="p-md font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md">
                  {paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low/30 transition-colors">
                      <td className="p-md font-mono-data text-mono-data text-primary font-bold">
                        <Link to={`/app/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                      </td>
                      <td className="p-md font-bold text-primary max-w-xs truncate">{inv.title}</td>
                      <td className="p-md">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary text-sm">{inv.customerName}</span>
                          <span className="text-on-surface-variant text-xs">{inv.customerEmail}</span>
                        </div>
                      </td>
                      <td className="p-md text-on-surface-variant text-sm">{formatDate(inv.dueDate)}</td>
                      <td className="p-md font-mono-amount text-mono-amount text-primary">{formatAmount(inv.amount)} {inv.asset}</td>
                      <td className="p-md">{getStatusBadge(inv.status)}</td>
                      <td className="p-md text-right">
                        <Link 
                          to={`/app/invoices/${inv.id}`}
                          className="text-on-surface-variant hover:text-primary p-2 inline-block transition-colors"
                          title="View Details"
                        >
                          <ArrowRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="md:hidden divide-y divide-outline-variant/30">
              {paginatedInvoices.map((inv) => (
                <div key={inv.id} className="p-md flex flex-col gap-2 bg-surface-container-lowest">
                  <div className="flex justify-between items-center">
                    <span className="font-mono-data text-mono-data text-primary font-bold">{inv.invoiceNumber}</span>
                    {getStatusBadge(inv.status)}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-primary text-sm truncate">{inv.title}</h4>
                    <p className="text-xs text-on-surface-variant">{inv.customerName} ({inv.customerEmail})</p>
                  </div>
                  <div className="flex justify-between items-center border-t border-dashed border-outline-variant/20 pt-2 mt-1">
                    <div className="text-[11px] text-on-surface-variant flex flex-col">
                      <span>Created: {formatDate(inv.createdAt)}</span>
                      <span>Due: {formatDate(inv.dueDate)}</span>
                    </div>
                    <div className="flex items-center gap-md">
                      <span className="font-mono-amount text-mono-amount text-primary font-bold text-sm">
                        {formatAmount(inv.amount)} {inv.asset}
                      </span>
                      <Link to={`/app/invoices/${inv.id}`} className="text-secondary hover:text-secondary-fixed-dim">
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="p-md border-t border-outline-variant/30 bg-surface-container-low/20 flex justify-between items-center">
              <span className="font-label-sm text-xs text-on-surface-variant font-bold">
                Showing {Math.min(filteredInvoices.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredInvoices.length, currentPage * itemsPerPage)} of {filteredInvoices.length} invoices
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 border border-outline-variant rounded hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-mono-data text-xs px-2 font-bold">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 border border-outline-variant rounded hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
export default InvoiceList;
