import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from './stellar.service';

@Injectable()
export class StellarEventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StellarEventListenerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private stellarService: StellarService,
  ) {}

  onModuleInit() {
    this.logger.log('Starting Stellar Event Listener Service (polling interval: 15s)...');
    this.timer = setInterval(() => this.pollPendingPayments(), 15000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async pollPendingPayments() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const openInvoices = await this.prisma.invoice.findMany({
        where: {
          status: { in: ['OPEN', 'PAYMENT_PENDING'] },
          paymentType: 'DIRECT',
        },
        include: { asset: true },
        take: 20,
      });

      for (const invoice of openInvoices) {
        try {
          const recentPayments = await this.stellarService.getRecentAccountPayments(
            invoice.destinationWallet,
            15,
          );

          for (const op of recentPayments) {
            if (op.type !== 'payment') continue;
            const record = op as any;
            const opAmount = Number.parseFloat(record.amount);
            const expectedAmount = invoice.totalAmount.toNumber();

            if (Math.abs(opAmount - expectedAmount) < 0.0001) {
              const txHash = record.transaction_hash;
              const isMatch = await this.stellarService.verifyTransaction(
                txHash,
                record.from,
                invoice.destinationWallet,
                invoice.totalAmount.toString(),
                invoice.memo,
                invoice.asset?.code || 'XLM',
                invoice.asset?.issuer || undefined,
              );

              if (isMatch) {
                this.logger.log(
                  `Auto-confirmed payment for invoice ${invoice.invoiceNumber} via transaction ${txHash}`,
                );

                await this.prisma.$transaction(async (tx) => {
                  const confirmedAt = new Date();
                  await tx.invoice.update({
                    where: { id: invoice.id },
                    data: {
                      status: 'PAID',
                      amountPaid: invoice.totalAmount,
                      paidAt: confirmedAt,
                    },
                  });

                  await tx.payment.upsert({
                    where: { transactionHash: txHash },
                    create: {
                      invoiceId: invoice.id,
                      assetId: invoice.assetId,
                      payerWallet: record.from,
                      receiverWallet: invoice.destinationWallet,
                      expectedAmount: invoice.totalAmount,
                      paidAmount: invoice.totalAmount,
                      direction: 'INCOMING',
                      paymentType: 'DIRECT',
                      status: 'CONFIRMED',
                      memo: invoice.memo,
                      sourceAccount: record.from,
                      transactionHash: txHash,
                      confirmedAt,
                      ledgerClosedAt: confirmedAt,
                      resultCode: 'tx_success',
                    },
                    update: {
                      status: 'CONFIRMED',
                      confirmedAt,
                    },
                  });
                });

                break;
              }
            }
          }
        } catch (err) {
          // Log softly per invoice to prevent loop interruption
          this.logger.debug(`Error checking payments for invoice ${invoice.id}: ${err}`);
        }
      }
    } catch (error) {
      this.logger.error('Error during Stellar event polling:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
