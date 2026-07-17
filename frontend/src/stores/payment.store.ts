import { create } from 'zustand';
import type { InvoiceDto, PaymentDto } from '../types/api.types';
import { paymentsApi } from '../services/api/payments.api';
import { escrowsApi } from '../services/api/escrows.api';
import { hasAccessToken } from '../services/api/api-client';
import { classicPaymentService, validateIntentAgainstInvoice } from '../services/stellar/classic-payment.service';
import { pollPaymentIntentStatus } from '../services/stellar/transaction-poller.service';
import { freighterService } from '../services/stellar/freighter.service';
import { useWalletStore } from './wallet.store';

export type PaymentProgressStatus =
  | 'idle'
  | 'preparing'
  | 'awaiting_signature'
  | 'submitting'
  | 'confirming'
  | 'success'
  | 'failed';

interface PaymentState {
  status: PaymentProgressStatus;
  currentPayment: PaymentDto | null;
  activePaymentIntentId: string | null;
  payments: PaymentDto[];
  error: string | null;
  fetchPayments: () => Promise<PaymentDto[]>;
  fetchPayment: (id: string) => Promise<PaymentDto>;
  startPayment: (publicToken: string, amount: string, asset: string, fromWallet: string, toWallet: string, invoice?: InvoiceDto) => Promise<PaymentDto | null>;
  recoverPayment: (publicToken: string) => Promise<PaymentDto | null>;
  resetPayment: () => void;
}

const BUSY_STATES: PaymentProgressStatus[] = ['preparing', 'awaiting_signature', 'submitting', 'confirming'];

export const usePaymentStore = create<PaymentState>((set, get) => ({
  status: 'idle',
  currentPayment: null,
  activePaymentIntentId: null,
  payments: [],
  error: null,

  fetchPayments: async () => {
    if (!hasAccessToken() || !useWalletStore.getState().address) {
      set({ payments: [] });
      return [];
    }

    const payments = await paymentsApi.list();
    set({ payments });
    return payments;
  },

  fetchPayment: async (id) => {
    const payment = await paymentsApi.get(id);
    set({ currentPayment: payment });
    return payment;
  },

  startPayment: async (publicToken, amount, asset, fromWallet, toWallet, invoice) => {
    if (BUSY_STATES.includes(get().status)) {
      return null;
    }

    set({ status: 'preparing', error: null });
    try {
      if (invoice?.paymentType === 'ESCROW') {
        const createIntent = await escrowsApi.createIntent(publicToken, fromWallet);
        sessionStorage.setItem(`lumora_escrow_id:${publicToken}`, createIntent.escrowId);

        if (createIntent.needsCreate) {
          const approvedCreate = window.confirm(
            [
              'Review Stellar Testnet escrow creation',
              `Amount: ${createIntent.amount} ${createIntent.asset}`,
              `Escrow contract: ${createIntent.contractId}`,
              `Escrow ID: ${createIntent.onChainEscrowId}`,
              'Freighter will first create the escrow record on-chain.',
            ].join('\n'),
          );
          if (!approvedCreate || !createIntent.unsignedXdr) {
            throw new Error('Escrow creation review was cancelled before Freighter signing.');
          }

          set({ status: 'awaiting_signature' });
          const signedCreateXdr = await freighterService.signSorobanTransaction(
            createIntent.unsignedXdr,
            fromWallet,
          );

          set({ status: 'submitting' });
          await escrowsApi.submitCreate(createIntent.escrowId, signedCreateXdr, fromWallet);
        }

        set({ status: 'preparing' });
        const depositIntent = await escrowsApi.preparePublicDeposit(createIntent.escrowId, fromWallet);
        sessionStorage.setItem(`lumora_payment_intent:${publicToken}`, depositIntent.paymentId);
        set({ activePaymentIntentId: depositIntent.paymentId });

        const approvedDeposit = window.confirm(
          [
            'Review Stellar Testnet escrow deposit',
            `Amount: ${depositIntent.amount} ${depositIntent.asset}`,
            `Escrow contract: ${depositIntent.contractId}`,
            `Network: ${depositIntent.network}`,
            'Funds will be held by the Payment Escrow contract until release or refund.',
          ].join('\n'),
        );
        if (!approvedDeposit) {
          throw new Error('Escrow deposit review was cancelled before Freighter signing.');
        }

        set({ status: 'awaiting_signature' });
        const signedDepositXdr = await freighterService.signSorobanTransaction(
          depositIntent.unsignedXdr,
          fromWallet,
        );

        set({ status: 'submitting' });
        const submittedPayment = await escrowsApi.submitPublicDeposit(
          createIntent.escrowId,
          signedDepositXdr,
          fromWallet,
          depositIntent.paymentId,
        );
        sessionStorage.setItem(`lumora_last_payment_id:${publicToken}`, submittedPayment.id);

        set((state) => ({
          status: 'success',
          currentPayment: submittedPayment,
          payments: [
            submittedPayment,
            ...state.payments.filter((payment) => payment.id !== submittedPayment.id),
          ],
        }));

        return submittedPayment;
      }

      const intent = await classicPaymentService.createIntent(publicToken, fromWallet);
      sessionStorage.setItem(`lumora_payment_intent:${publicToken}`, intent.id);
      set({ activePaymentIntentId: intent.id });

      const invoiceSnapshot =
        invoice ??
        ({
          id: intent.invoiceId,
          invoiceNumber: intent.invoiceId,
          publicToken,
          title: '',
          description: '',
          amount,
          asset,
          dueDate: '',
          memo: intent.memo,
          status: 'OPEN',
          customerName: '',
          customerEmail: '',
          customerWallet: '',
          destinationWallet: toWallet,
          createdAt: '',
          items: [],
        } satisfies InvoiceDto);

      validateIntentAgainstInvoice(intent, invoiceSnapshot);
      const approved = window.confirm(
        [
          'Review Stellar Testnet payment',
          `Amount: ${intent.amount} ${intent.asset}`,
          `Destination: ${intent.destination}`,
          `Memo: ${intent.memo}`,
          `Network: ${intent.network}`,
        ].join('\n'),
      );
      if (!approved) {
        throw new Error('Payment review was cancelled before Freighter signing.');
      }

      set({ status: 'awaiting_signature' });
      const signedXdr = await freighterService.signClassicTransaction(intent.unsignedXdr, fromWallet);

      set({ status: 'submitting' });
      const submittedPayment = await paymentsApi.submitIntent(intent.id, signedXdr, fromWallet);
      sessionStorage.setItem(`lumora_last_payment_id:${publicToken}`, submittedPayment.id);

      set({ status: 'confirming', currentPayment: submittedPayment });
      const status = await pollPaymentIntentStatus(intent.id, 30);
      const confirmedPayment = status.payment ?? submittedPayment;

      if (status.status !== 'CONFIRMED') {
        throw new Error(`Payment finished with status ${status.status}`);
      }

      set((state) => ({
        status: 'success',
        currentPayment: confirmedPayment,
        payments: [confirmedPayment, ...state.payments.filter((payment) => payment.id !== confirmedPayment.id)],
      }));

      return confirmedPayment;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Payment failed';
      set({ status: 'failed', error: message });
      return null;
    }
  },

  recoverPayment: async (publicToken) => {
    const paymentIntentId =
      get().activePaymentIntentId || sessionStorage.getItem(`lumora_payment_intent:${publicToken}`);
    const lastPaymentId = sessionStorage.getItem(`lumora_last_payment_id:${publicToken}`);

    try {
      if (paymentIntentId) {
        set({ status: 'confirming', activePaymentIntentId: paymentIntentId, error: null });
        const status = await pollPaymentIntentStatus(paymentIntentId, 30);

        if (status.status === 'CONFIRMED' && status.payment) {
          sessionStorage.setItem(`lumora_last_payment_id:${publicToken}`, status.payment.id);
          set({ status: 'success', currentPayment: status.payment });
          return status.payment;
        }

        if (status.status === 'FAILED' || status.status === 'EXPIRED' || status.status === 'REVERSED') {
          set({ status: 'failed', error: `Payment ${status.status.toLowerCase()}` });
          return null;
        }

        set({ status: 'confirming', error: 'Verification is still pending on Stellar.' });
        return null;
      }

      if (lastPaymentId) {
        const payment = await paymentsApi.get(lastPaymentId);
        set({ status: payment.status === 'CONFIRMED' ? 'success' : 'confirming', currentPayment: payment });
        return payment;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to recover payment status';
      set({ status: 'failed', error: message });
    }

    return null;
  },

  resetPayment: () => {
    set({ status: 'idle', currentPayment: null, activePaymentIntentId: null, error: null });
  },
}));
export default usePaymentStore;
