import { paymentsApi } from '../api/payments.api';
import { freighterService } from './freighter.service';
import type { InvoiceDto, PaymentDto, PaymentIntentDto } from '../../types/api.types';

export function validateIntentAgainstInvoice(intent: PaymentIntentDto, invoice: InvoiceDto) {
  if (parseFloat(intent.amount).toFixed(7) !== parseFloat(invoice.amount).toFixed(7)) {
    throw new Error('Backend payment intent amount does not match the displayed invoice.');
  }

  if (intent.destination !== invoice.destinationWallet) {
    throw new Error('Backend payment intent destination does not match the displayed invoice.');
  }

  if (intent.memo !== invoice.memo) {
    throw new Error('Backend payment intent memo does not match the displayed invoice.');
  }
}

export const classicPaymentService = {
  async createIntent(publicToken: string, payerWallet: string) {
    return paymentsApi.createIntent(publicToken, payerWallet);
  },

  async signAndSubmit(intent: PaymentIntentDto, payerWallet: string): Promise<PaymentDto> {
    const signedXdr = await freighterService.signClassicTransaction(intent.unsignedXdr, payerWallet);
    return paymentsApi.submitIntent(intent.id, signedXdr, payerWallet);
  },
};
