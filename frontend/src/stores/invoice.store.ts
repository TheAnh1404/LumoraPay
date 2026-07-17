import { create } from 'zustand';
import { invoicesApi } from '../services/api/invoices.api';
import { hasAccessToken } from '../services/api/api-client';
import type { CreateInvoiceRequest, InvoiceDto } from '../types/api.types';
import { useWalletStore } from './wallet.store';

interface InvoiceState {
  invoices: InvoiceDto[];
  fetchInvoices: () => Promise<InvoiceDto[]>;
  createInvoice: (invoiceData: CreateInvoiceRequest) => Promise<InvoiceDto>;
  getInvoice: (id: string) => Promise<InvoiceDto | undefined>;
  getInvoiceByPublicToken: (publicToken: string) => Promise<InvoiceDto>;
  cancelInvoice: (id: string) => Promise<void>;
  openInvoice: (id: string) => Promise<InvoiceDto>;
  duplicateInvoice: (id: string) => Promise<InvoiceDto>;
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
  invoices: [],

  fetchInvoices: async () => {
    if (!hasAccessToken() || !useWalletStore.getState().address) {
      set({ invoices: [] });
      return [];
    }

    const invoices = await invoicesApi.list();
    set({ invoices });
    return invoices;
  },

  createInvoice: async (invoiceData) => {
    const newInvoice = await invoicesApi.create(invoiceData);
    set((state) => ({ invoices: [newInvoice, ...state.invoices] }));
    return newInvoice;
  },

  getInvoice: async (id) => {
    try {
      return await invoicesApi.get(id);
    } catch {
      return undefined;
    }
  },

  getInvoiceByPublicToken: async (publicToken) => invoicesApi.publicByToken(publicToken),

  cancelInvoice: async (id) => {
    const cancelled = await invoicesApi.cancel(id);
    set((state) => ({
      invoices: state.invoices.map((invoice) => (invoice.id === id ? cancelled : invoice)),
    }));
  },

  openInvoice: async (id) => {
    const opened = await invoicesApi.open(id);
    set((state) => ({
      invoices: state.invoices.map((invoice) => (invoice.id === id ? opened : invoice)),
    }));
    return opened;
  },

  duplicateInvoice: async (id) => {
    const duplicated = await invoicesApi.duplicate(id);
    set((state) => ({ invoices: [duplicated, ...state.invoices] }));
    return duplicated;
  },
}));
export default useInvoiceStore;
