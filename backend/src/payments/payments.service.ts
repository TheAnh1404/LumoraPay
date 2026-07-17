import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private stellarService: StellarService,
  ) {}

  private formatPayment(payment: any) {
    return {
      id: payment.id,
      invoiceId: payment.invoice?.id || payment.invoiceId,
      invoiceNumber: payment.invoice?.invoiceNumber,
      amount: payment.paidAmount?.toFixed
        ? payment.paidAmount.toFixed(2)
        : payment.expectedAmount.toFixed(2),
      asset: payment.asset?.code || 'XLM',
      fromWallet: payment.payerWallet,
      toWallet: payment.receiverWallet,
      hash: payment.transactionHash || '',
      ledger: payment.ledger ? Number(payment.ledger) : 0,
      fee: payment.feeCharged
        ? (Number(payment.feeCharged) / 10000000).toFixed(7)
        : '0.0000000',
      timestamp: payment.confirmedAt
        ? payment.confirmedAt.toISOString()
        : payment.submittedAt
          ? payment.submittedAt.toISOString()
          : payment.createdAt.toISOString(),
      status: payment.status,
      explorerUrl: payment.transactionHash
        ? this.stellarService.getTransactionExplorerUrl(payment.transactionHash)
        : null,
      receiptUrl: `/receipt/${payment.id}`,
    };
  }

  async createPaymentIntent(publicToken: string, payerWallet: string) {
    this.stellarService.validatePublicKey(payerWallet);
    const invoice = await this.prisma.invoice.findUnique({
      where: { publicToken },
      include: { asset: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'OPEN') {
      throw new BadRequestException('Invoice is not open for payment');
    }

    if (invoice.expiresAt && invoice.expiresAt < new Date()) {
      throw new BadRequestException('Invoice payment link has expired');
    }

    if (invoice.paymentType !== 'DIRECT') {
      throw new BadRequestException(
        'This endpoint only supports direct XLM invoices',
      );
    }

    const alreadyConfirmed = await this.prisma.payment.findFirst({
      where: { invoiceId: invoice.id, status: 'CONFIRMED' },
    });
    if (alreadyConfirmed) {
      throw new BadRequestException('Invoice is already paid');
    }

    const txData = await this.stellarService.buildPaymentTx(
      payerWallet,
      invoice.destinationWallet,
      invoice.totalAmount.toString(),
      invoice.memo,
    );

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        assetId: invoice.assetId,
        payerWallet,
        receiverWallet: invoice.destinationWallet,
        expectedAmount: invoice.totalAmount,
        paidAmount: 0,
        direction: 'INCOMING',
        paymentType: invoice.paymentType,
        status: 'AWAITING_SIGNATURE',
        memo: invoice.memo,
        sourceAccount: payerWallet,
        blockchainTxs: {
          create: {
            kind: 'CLASSIC_PAYMENT',
            network: this.stellarService.getNetwork(),
            sourceAccount: payerWallet,
            unsignedXdr: txData.unsignedXdr,
            status: 'AWAITING_SIGNATURE',
          },
        },
      },
      include: { blockchainTxs: true },
    });

    return {
      id: payment.id,
      paymentId: payment.id,
      invoiceId: invoice.id,
      unsignedXdr: txData.unsignedXdr,
      network: this.stellarService.getNetwork(),
      networkPassphrase: txData.networkPassphrase,
      amount: invoice.totalAmount.toFixed(2),
      asset: invoice.asset.code,
      destination: invoice.destinationWallet,
      memo: invoice.memo,
      expiresAt: txData.expiresAt.toISOString(),
    };
  }

  async submitPaymentIntent(
    paymentIntentId: string,
    signedXdr: string,
    payerWallet: string,
  ) {
    this.stellarService.validatePublicKey(payerWallet);
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentIntentId },
      include: {
        invoice: true,
        asset: true,
        blockchainTxs: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment intent not found');
    }

    if (payment.status === 'CONFIRMED') {
      return this.formatPayment(payment);
    }

    if (payment.status === 'FAILED' || payment.status === 'EXPIRED') {
      throw new BadRequestException(
        `Payment intent is ${payment.status.toLowerCase()}`,
      );
    }

    const invoice = payment.invoice;
    if (invoice.status !== 'OPEN') {
      throw new BadRequestException('Invoice is not open for payment');
    }

    this.stellarService.verifyPaymentXdr(
      signedXdr,
      payerWallet,
      invoice.destinationWallet,
      invoice.totalAmount.toString(),
      invoice.memo,
    );

    const blockchainTx = payment.blockchainTxs[0];
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          sourceAccount: payerWallet,
        },
      }),
      this.prisma.blockchainTransaction.update({
        where: { id: blockchainTx.id },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      }),
    ]);

    let txResult: {
      hash: string;
      ledger: number;
      fee: string;
      createdAt?: string;
    };
    try {
      txResult = await this.stellarService.submitTransaction(signedXdr);
    } catch (e: any) {
      const message =
        e.response?.data?.extras?.result_codes?.operations?.[0] ||
        e.response?.data?.extras?.result_codes?.transaction ||
        e.message ||
        'Failed to submit transaction to Stellar network';
      this.logger.error(`Stellar Horizon submission failed: ${message}`);
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failureReason: message },
        }),
        this.prisma.blockchainTransaction.update({
          where: { id: blockchainTx.id },
          data: { status: 'FAILED', errorMessage: message },
        }),
      ]);
      throw new BadRequestException(message);
    }

    const isValid = await this.stellarService.verifyTransaction(
      txResult.hash,
      payerWallet,
      invoice.destinationWallet,
      invoice.totalAmount.toString(),
      invoice.memo,
    );

    if (!isValid) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            transactionHash: txResult.hash,
            failureReason: 'Horizon verification mismatch',
          },
        }),
        this.prisma.blockchainTransaction.update({
          where: { id: blockchainTx.id },
          data: {
            status: 'FAILED',
            transactionHash: txResult.hash,
            ledger: BigInt(txResult.ledger),
            errorMessage: 'Horizon verification mismatch',
          },
        }),
      ]);
      throw new BadRequestException(
        'Transaction verification failed: parameters mismatch',
      );
    }

    const confirmedAt = txResult.createdAt
      ? new Date(txResult.createdAt)
      : new Date();
    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const savedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          paidAmount: invoice.totalAmount,
          status: 'CONFIRMED',
          transactionHash: txResult.hash,
          ledger: BigInt(txResult.ledger),
          feeCharged: BigInt(txResult.fee),
          submittedAt: new Date(),
          confirmedAt,
          ledgerClosedAt: confirmedAt,
          resultCode: 'tx_success',
        },
        include: { invoice: true, asset: true },
      });

      await tx.blockchainTransaction.update({
        where: { id: blockchainTx.id },
        data: {
          transactionHash: txResult.hash,
          status: 'SUCCESS',
          ledger: BigInt(txResult.ledger),
          feeCharged: BigInt(txResult.fee),
          resultCode: 'tx_success',
          submittedAt: new Date(),
          confirmedAt,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          amountPaid: invoice.totalAmount,
          paidAt: confirmedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          merchantId: invoice.merchantId,
          action: 'payment.confirmed',
          entityType: 'payment',
          entityId: payment.id,
          metadata: {
            invoiceId: invoice.id,
            transactionHash: txResult.hash,
            ledger: txResult.ledger,
          },
        },
      });

      return savedPayment;
    });

    return this.formatPayment(updatedPayment);
  }

  async getPaymentIntentStatus(paymentIntentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentIntentId },
      include: {
        asset: true,
        invoice: true,
        blockchainTxs: true,
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment intent not found');
    }

    const tx = payment.blockchainTxs[0];
    return {
      id: payment.id,
      paymentId: payment.id,
      status: payment.status,
      transactionStatus: tx?.status,
      transactionHash: payment.transactionHash,
      explorerUrl: payment.transactionHash
        ? this.stellarService.getTransactionExplorerUrl(payment.transactionHash)
        : null,
      payment:
        payment.status === 'CONFIRMED'
          ? this.formatPayment(payment)
          : undefined,
    };
  }

  async findAll(userId: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) return [];

    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          merchantId: membership.merchantId,
        },
      },
      include: {
        invoice: true,
        asset: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((payment) => this.formatPayment(payment));
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            customer: true,
            asset: true,
            items: true,
            merchant: true,
          },
        },
        asset: true,
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.formatPayment(payment);
  }

  async findByHash(transactionHash: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionHash },
      include: {
        invoice: true,
        asset: true,
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.formatPayment(payment);
  }

  async getReceipt(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            customer: true,
            asset: true,
            items: true,
            merchant: true,
          },
        },
        asset: true,
      },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      payment: this.formatPayment(payment),
      invoice: {
        id: payment.invoice.id,
        invoiceNumber: payment.invoice.invoiceNumber,
        publicToken: payment.invoice.publicToken,
        title: payment.invoice.title,
        description: payment.invoice.description || '',
        amount: payment.invoice.totalAmount.toFixed(2),
        asset: payment.invoice.asset.code,
        dueDate: payment.invoice.dueAt
          ? payment.invoice.dueAt.toISOString().substring(0, 10)
          : '',
        memo: payment.invoice.memo,
        status: payment.invoice.status,
        customerName: payment.invoice.customer?.name || 'Unknown Customer',
        customerEmail: payment.invoice.customer?.email || '',
        customerWallet: payment.invoice.customer?.walletAddress || '',
        destinationWallet: payment.invoice.destinationWallet,
        createdAt: payment.invoice.createdAt.toISOString().substring(0, 10),
        merchantName: payment.invoice.merchant.businessName,
        items: payment.invoice.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || item.name,
          quantity: item.quantity.toNumber(),
          unitPrice: item.unitPrice.toFixed(2),
          totalPrice: item.totalPrice.toFixed(2),
        })),
      },
      network: this.stellarService.getNetwork(),
      sourceAccount: payment.payerWallet,
      destination: payment.receiverWallet,
      memo: payment.memo,
      ledgerClosedAt: payment.ledgerClosedAt
        ? payment.ledgerClosedAt.toISOString()
        : null,
      explorerUrl: payment.transactionHash
        ? this.stellarService.getTransactionExplorerUrl(payment.transactionHash)
        : null,
    };
  }

  async requestFaucet(address: string) {
    const funded = await this.stellarService.requestFaucet(address);
    if (!funded.success) {
      throw new BadRequestException('Friendbot funding request failed');
    }
    return {
      success: true,
      address,
      balance: funded.balance,
      transactionHash: funded.transactionHash,
    };
  }

  async prepareRefund(
    userId: string,
    paymentId: string,
    data: { amount: string; reason: string },
  ) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
      include: { merchant: { include: { defaultWallet: true } } },
    });
    if (!membership) {
      throw new NotFoundException('No merchant associated');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, invoice: { merchantId: membership.merchantId } },
      include: { invoice: true, refunds: true, asset: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status !== 'CONFIRMED') {
      throw new BadRequestException('Only confirmed payments can be refunded');
    }

    const requestedAmount = Number.parseFloat(data.amount);
    const confirmedRefunds = payment.refunds
      .filter((refund) => refund.status === 'CONFIRMED')
      .reduce((sum, refund) => sum + refund.amount.toNumber(), 0);
    const refundableAmount = payment.paidAmount.toNumber() - confirmedRefunds;
    if (
      !Number.isFinite(requestedAmount) ||
      requestedAmount <= 0 ||
      requestedAmount > refundableAmount
    ) {
      throw new BadRequestException('Refund amount exceeds refundable balance');
    }

    const memo =
      `RF${payment.invoice.invoiceNumber.replace(/[^0-9]/g, '').slice(-8)}`.slice(
        0,
        28,
      );
    const txData = await this.stellarService.buildPaymentTx(
      membership.merchant.defaultWallet.publicKey,
      payment.payerWallet,
      requestedAmount.toFixed(7),
      memo,
    );

    const refund = await this.prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: requestedAmount,
        reason: data.reason,
        status: 'AWAITING_SIGNATURE',
        requestedByUserId: userId,
        destinationWallet: payment.payerWallet,
      },
    });

    await this.prisma.blockchainTransaction.create({
      data: {
        userId,
        invoiceId: payment.invoiceId,
        paymentId: payment.id,
        kind: 'REFUND',
        network: this.stellarService.getNetwork(),
        sourceAccount: membership.merchant.defaultWallet.publicKey,
        unsignedXdr: txData.unsignedXdr,
        status: 'AWAITING_SIGNATURE',
      },
    });

    return {
      id: refund.id,
      unsignedXdr: txData.unsignedXdr,
      networkPassphrase: txData.networkPassphrase,
      amount: requestedAmount.toFixed(2),
      destination: payment.payerWallet,
      memo,
    };
  }

  async submitRefund(userId: string, refundId: string, signedXdr: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          include: {
            invoice: {
              include: {
                merchant: { include: { defaultWallet: true } },
              },
            },
            asset: true,
          },
        },
      },
    });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId, merchantId: refund.payment.invoice.merchantId },
    });
    if (!membership) {
      throw new NotFoundException('Refund not found');
    }
    if (refund.status === 'CONFIRMED' && refund.transactionHash) {
      return {
        id: refund.id,
        transactionHash: refund.transactionHash,
        explorerUrl: this.stellarService.getTransactionExplorerUrl(
          refund.transactionHash,
        ),
      };
    }

    const memo =
      `RF${refund.payment.invoice.invoiceNumber.replace(/[^0-9]/g, '').slice(-8)}`.slice(
        0,
        28,
      );
    this.stellarService.verifyPaymentXdr(
      signedXdr,
      refund.payment.invoice.merchant.defaultWallet.publicKey,
      refund.destinationWallet,
      refund.amount.toString(),
      memo,
    );

    const blockchainTx = await this.prisma.blockchainTransaction.findFirst({
      where: {
        paymentId: refund.paymentId,
        kind: 'REFUND',
        sourceAccount: refund.payment.invoice.merchant.defaultWallet.publicKey,
        status: {
          in: ['AWAITING_SIGNATURE', 'SIGNED', 'SUBMITTED', 'PENDING'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (blockchainTx) {
      await this.prisma.blockchainTransaction.update({
        where: { id: blockchainTx.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
    }

    let txResult: {
      hash: string;
      ledger: number;
      fee: string;
      createdAt?: string;
    };
    try {
      txResult = await this.stellarService.submitTransaction(signedXdr);
    } catch (e: any) {
      const message =
        e.response?.data?.extras?.result_codes?.operations?.[0] ||
        e.response?.data?.extras?.result_codes?.transaction ||
        e.message ||
        'Failed to submit refund transaction to Stellar network';
      this.logger.error(`Stellar refund submission failed: ${message}`);
      await this.prisma.$transaction([
        this.prisma.refund.update({
          where: { id: refund.id },
          data: { status: 'FAILED' },
        }),
        ...(blockchainTx
          ? [
              this.prisma.blockchainTransaction.update({
                where: { id: blockchainTx.id },
                data: {
                  status: 'FAILED',
                  errorMessage: message,
                },
              }),
            ]
          : []),
      ]);
      throw new BadRequestException(message);
    }

    const isValid = await this.stellarService.verifyTransaction(
      txResult.hash,
      refund.payment.invoice.merchant.defaultWallet.publicKey,
      refund.destinationWallet,
      refund.amount.toString(),
      memo,
    );
    if (!isValid) {
      await this.prisma.$transaction([
        this.prisma.refund.update({
          where: { id: refund.id },
          data: {
            status: 'FAILED',
            transactionHash: txResult.hash,
            ledger: BigInt(txResult.ledger),
          },
        }),
        ...(blockchainTx
          ? [
              this.prisma.blockchainTransaction.update({
                where: { id: blockchainTx.id },
                data: {
                  status: 'FAILED',
                  transactionHash: txResult.hash,
                  ledger: BigInt(txResult.ledger),
                  errorMessage: 'Horizon verification mismatch',
                },
              }),
            ]
          : []),
      ]);
      throw new BadRequestException('Refund transaction verification failed');
    }

    const totalConfirmedRefunds = await this.prisma.refund.aggregate({
      where: {
        paymentId: refund.paymentId,
        status: 'CONFIRMED',
      },
      _sum: { amount: true },
    });
    const newRefundedTotal =
      (totalConfirmedRefunds._sum.amount?.toNumber() || 0) +
      refund.amount.toNumber();
    const invoiceStatus =
      newRefundedTotal >= refund.payment.paidAmount.toNumber()
        ? 'REFUNDED'
        : 'PARTIALLY_REFUNDED';

    const confirmed = await this.prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: 'CONFIRMED',
          transactionHash: txResult.hash,
          ledger: BigInt(txResult.ledger),
          confirmedAt: txResult.createdAt
            ? new Date(txResult.createdAt)
            : new Date(),
        },
      });

      await tx.invoice.update({
        where: { id: refund.payment.invoiceId },
        data: { status: invoiceStatus },
      });

      if (blockchainTx) {
        await tx.blockchainTransaction.update({
          where: { id: blockchainTx.id },
          data: {
            transactionHash: txResult.hash,
            status: 'SUCCESS',
            ledger: BigInt(txResult.ledger),
            feeCharged: BigInt(txResult.fee),
            resultCode: 'tx_success',
            submittedAt: new Date(),
            confirmedAt: txResult.createdAt
              ? new Date(txResult.createdAt)
              : new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          merchantId: refund.payment.invoice.merchantId,
          action: 'refund.confirmed',
          entityType: 'refund',
          entityId: refund.id,
          metadata: {
            paymentId: refund.paymentId,
            transactionHash: txResult.hash,
          },
        },
      });

      return updatedRefund;
    });

    return {
      id: confirmed.id,
      transactionHash: confirmed.transactionHash,
      explorerUrl: confirmed.transactionHash
        ? this.stellarService.getTransactionExplorerUrl(
            confirmed.transactionHash,
          )
        : null,
    };
  }

  async getRefund(userId: string, refundId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: { include: { invoice: true } } },
    });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId, merchantId: refund.payment.invoice.merchantId },
    });
    if (!membership) {
      throw new NotFoundException('Refund not found');
    }
    return refund;
  }
}
