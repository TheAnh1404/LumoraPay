import { usePaymentStore } from '../stores/payment.store';
import type { PaymentDto } from '../types/api.types';

export class PaymentService {
  async processPayment(
    publicToken: string,
    amount: string,
    asset: string,
    fromWallet: string,
    toWallet: string
  ): Promise<PaymentDto | null> {
    return usePaymentStore.getState().startPayment(publicToken, amount, asset, fromWallet, toWallet);
  }
}

export const paymentService = new PaymentService();
export default paymentService;
