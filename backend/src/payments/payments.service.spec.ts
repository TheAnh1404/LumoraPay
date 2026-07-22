import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

jest.mock('@stellar/stellar-sdk', () => ({
  StrKey: {
    isValidEd25519PublicKey: jest.fn(() => true),
  },
}));

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaMock: any;
  let stellarServiceMock: any;

  const mockPayer = 'GCBQXHUQGXFYK4B6I3OVQCVWUU6PZGFZ2U4GXZ64K3VJLKD3UXUQ2N7A';
  const mockWrongPayer = 'GDFQXHUQGXFYK4B6I3OVQCVWUU6PZGFZ2U4GXZ64K3VJLKD3UXUQ2N7B';
  const mockMerchant = 'GABQXHUQGXFYK4B6I3OVQCVWUU6PZGFZ2U4GXZ64K3VJLKD3UXUQ2N7C';

  beforeEach(() => {
    prismaMock = {
      invoice: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      blockchainTransaction: {
        update: jest.fn(),
      },
      $transaction: jest.fn(async (arg) => {
        if (typeof arg === 'function') {
          return arg(prismaMock);
        }
        return Promise.all(arg);
      }),
    };

    stellarServiceMock = {
      validatePublicKey: jest.fn(),
      buildPaymentTx: jest.fn().mockResolvedValue({
        unsignedXdr: 'AAAA_MOCK_UNSIGNED_XDR',
        networkPassphrase: 'Test SDF Network ; September 2015',
        expiresAt: new Date(Date.now() + 60000),
      }),
      verifyPaymentXdr: jest.fn(),
      submitTransaction: jest.fn(),
      verifyTransaction: jest.fn(),
      getNetwork: jest.fn().mockReturnValue('TESTNET'),
      getTransactionExplorerUrl: jest.fn().mockReturnValue('https://stellar.expert/tx/123'),
    };

    service = new PaymentsService(prismaMock, stellarServiceMock);
  });

  describe('submitPaymentIntent', () => {
    it('should throw BadRequestException if payer wallet mismatches payment intent', async () => {
      prismaMock.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        payerWallet: mockPayer,
        status: 'AWAITING_SIGNATURE',
        invoice: { id: 'inv-1', status: 'OPEN', totalAmount: { toString: () => '10' }, memo: 'LM-001', destinationWallet: mockMerchant },
        blockchainTxs: [{ id: 'tx-1' }],
      });

      await expect(
        service.submitPaymentIntent('payment-1', 'AAAA_SIGNED_XDR', mockWrongPayer),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if invoice lock fails (already pending or paid)', async () => {
      prismaMock.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        payerWallet: mockPayer,
        status: 'AWAITING_SIGNATURE',
        invoice: { id: 'inv-1', status: 'PAID', totalAmount: { toString: () => '10' }, memo: 'LM-001', destinationWallet: mockMerchant },
        blockchainTxs: [{ id: 'tx-1' }],
      });

      prismaMock.invoice.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.submitPaymentIntent('payment-1', 'AAAA_SIGNED_XDR', mockPayer),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
