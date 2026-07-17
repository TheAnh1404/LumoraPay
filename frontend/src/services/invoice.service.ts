import { useInvoiceStore } from '../stores/invoice.store';
import type { CreateInvoiceRequest, InvoiceDto } from '../types/api.types';

export class InvoiceService {
  async getInvoice(id: string): Promise<InvoiceDto | undefined> {
    return useInvoiceStore.getState().getInvoice(id);
  }

  async createInvoice(invoice: CreateInvoiceRequest): Promise<InvoiceDto> {
    return useInvoiceStore.getState().createInvoice(invoice);
  }

  async markAsPaid(_id: string): Promise<void> {
    // Invoices are updated automatically through blockchain event listeners
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;
