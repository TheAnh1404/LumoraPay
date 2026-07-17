import { paymentsApi } from '../api/payments.api';
import type { PaymentStatusDto } from '../../types/api.types';

const TERMINAL = new Set(['CONFIRMED', 'FAILED', 'EXPIRED', 'REVERSED']);

export async function pollPaymentIntentStatus(paymentIntentId: string, maxAttempts = 20): Promise<PaymentStatusDto> {
  let lastStatus: PaymentStatusDto | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    lastStatus = await paymentsApi.intentStatus(paymentIntentId);
    if (TERMINAL.has(lastStatus.status)) {
      return lastStatus;
    }
    await new Promise((resolve) => window.setTimeout(resolve, Math.min(1500 + attempt * 250, 5000)));
  }

  if (!lastStatus) {
    throw new Error('Payment status was not returned by backend');
  }

  return lastStatus;
}
