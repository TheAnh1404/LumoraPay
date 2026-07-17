import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class MerchantsService {
  constructor(
    private prisma: PrismaService,
    private stellarService: StellarService,
  ) {}

  private normalizeSlug(slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      throw new BadRequestException(
        'Slug must use lowercase letters, numbers, and single hyphens',
      );
    }
    return normalized;
  }

  async getCurrentMerchant(userId: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
      include: {
        merchant: {
          include: {
            defaultWallet: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        'No merchant account associated with this user',
      );
    }

    return membership.merchant;
  }

  async create(
    userId: string,
    data: {
      businessName: string;
      slug: string;
      supportEmail?: string;
      defaultWalletAddress: string;
    },
  ) {
    const existingMembership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (existingMembership) {
      throw new ConflictException('User already has a merchant profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const slug = this.normalizeSlug(data.slug);
    const existingSlug = await this.prisma.merchant.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException('Merchant slug is already taken');
    }

    const defaultWallet = await this.prisma.wallet.upsert({
      where: {
        publicKey_network: {
          publicKey: data.defaultWalletAddress,
          network: 'TESTNET',
        },
      },
      update: {
        userId,
        isPrimary: true,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
      create: {
        userId,
        publicKey: data.defaultWalletAddress,
        network: 'TESTNET',
        isPrimary: true,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.updateMany({
        where: { userId, id: { not: defaultWallet.id } },
        data: { isPrimary: false },
      });

      const merchant = await tx.merchant.create({
        data: {
          ownerUserId: userId,
          businessName: data.businessName,
          slug,
          supportEmail: data.supportEmail,
          status: 'ACTIVE',
          defaultWalletId: defaultWallet.id,
        },
        include: { defaultWallet: true },
      });

      await tx.merchantMember.create({
        data: {
          merchantId: merchant.id,
          userId,
          role: 'OWNER',
        },
      });

      return merchant;
    });
  }

  async updateCurrent(
    userId: string,
    data: {
      businessName?: string;
      slug?: string;
      supportEmail?: string;
      defaultWalletAddress?: string;
    },
  ) {
    const merchant = await this.getCurrentMerchant(userId);
    let defaultWalletId = merchant.defaultWalletId;

    if (data.defaultWalletAddress) {
      const wallet = await this.prisma.wallet.upsert({
        where: {
          publicKey_network: {
            publicKey: data.defaultWalletAddress,
            network: 'TESTNET',
          },
        },
        update: {
          userId,
          isPrimary: true,
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
        create: {
          userId,
          publicKey: data.defaultWalletAddress,
          network: 'TESTNET',
          isPrimary: true,
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });
      defaultWalletId = wallet.id;
    }

    const slug = data.slug ? this.normalizeSlug(data.slug) : undefined;

    return this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        businessName: data.businessName,
        slug,
        supportEmail: data.supportEmail,
        defaultWalletId,
      },
      include: { defaultWallet: true },
    });
  }

  async getDashboardStats(userId: string) {
    const merchant = await this.getCurrentMerchant(userId);

    const invoices = await this.prisma.invoice.findMany({
      where: { merchantId: merchant.id },
      include: { customer: true, asset: true },
    });

    const paidInvoices = invoices.filter((i) => i.status === 'PAID');
    const openInvoices = invoices.filter((i) => i.status === 'OPEN');
    const payments = await this.prisma.payment.findMany({
      where: { invoice: { merchantId: merchant.id } },
      include: { invoice: true, asset: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const confirmedPayments = payments.filter(
      (payment) => payment.status === 'CONFIRMED',
    );
    const failedPayments = payments.filter(
      (payment) => payment.status === 'FAILED',
    );
    const totalReceived = confirmedPayments.reduce(
      (acc, curr) => acc + curr.paidAmount.toNumber(),
      0,
    );
    const totalCount = confirmedPayments.length + failedPayments.length;
    const successRate =
      totalCount > 0 ? (confirmedPayments.length / totalCount) * 100 : 100;

    // Build revenue history for the past 7 days
    const revenueHistory: { date: string; amount: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
      });

      const dayAmount = confirmedPayments
        .filter((payment) => {
          if (!payment.confirmedAt) return false;
          const paidDate = new Date(payment.confirmedAt);
          return (
            paidDate.getDate() === d.getDate() &&
            paidDate.getMonth() === d.getMonth() &&
            paidDate.getFullYear() === d.getFullYear()
          );
        })
        .reduce((sum, current) => sum + current.paidAmount.toNumber(), 0);

      revenueHistory.push({
        date: dateStr,
        amount: dayAmount,
      });
    }

    const walletBalance = merchant.defaultWallet?.publicKey
      ? await this.stellarService.getBalance(merchant.defaultWallet.publicKey)
      : '0.0000000';

    return {
      totalReceived: totalReceived.toFixed(2),
      asset: 'XLM',
      paidInvoices: paidInvoices.length,
      openInvoices: openInvoices.length,
      paymentSuccessRate: parseFloat(successRate.toFixed(1)),
      revenueHistory,
      walletBalance,
      recentInvoices: invoices
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          publicToken: invoice.publicToken,
          title: invoice.title,
          description: invoice.description || '',
          amount: invoice.totalAmount.toFixed(2),
          asset: invoice.asset.code,
          dueDate: invoice.dueAt
            ? invoice.dueAt.toISOString().substring(0, 10)
            : '',
          memo: invoice.memo,
          status: invoice.status,
          customerName: invoice.customer
            ? invoice.customer.name
            : 'Unknown Customer',
          customerEmail: invoice.customer ? invoice.customer.email || '' : '',
          customerWallet: invoice.customer
            ? invoice.customer.walletAddress || ''
            : '',
          destinationWallet: invoice.destinationWallet,
          createdAt: invoice.createdAt.toISOString().substring(0, 10),
        })),
      recentPayments: payments.slice(0, 5).map((payment) => ({
        id: payment.id,
        invoiceId: payment.invoice.id,
        invoiceNumber: payment.invoice.invoiceNumber,
        amount: payment.paidAmount.toFixed(2),
        asset: payment.asset.code,
        fromWallet: payment.payerWallet,
        toWallet: payment.receiverWallet,
        hash: payment.transactionHash || '',
        ledger: payment.ledger ? Number(payment.ledger) : 0,
        fee: payment.feeCharged
          ? (Number(payment.feeCharged) / 10000000).toFixed(7)
          : '0.0000000',
        timestamp: payment.confirmedAt
          ? payment.confirmedAt.toISOString()
          : payment.createdAt.toISOString(),
        status: payment.status,
        explorerUrl: payment.transactionHash
          ? this.stellarService.getTransactionExplorerUrl(
              payment.transactionHash,
            )
          : null,
      })),
    };
  }
}
