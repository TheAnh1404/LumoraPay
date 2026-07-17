import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    data: {
      name: string;
      email?: string;
      walletAddress?: string;
      notes?: string;
    },
  ) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new NotFoundException('No merchant associated');
    }

    return this.prisma.customer.create({
      data: {
        merchantId: membership.merchantId,
        name: data.name,
        email: data.email,
        walletAddress: data.walletAddress,
        notes: data.notes,
      },
    });
  }

  async findAll(userId: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) return [];

    const customers = await this.prisma.customer.findMany({
      where: { merchantId: membership.merchantId },
      include: {
        invoices: true,
      },
    });

    // Format output to match client requirements
    return customers.map((c) => {
      const paidInvoices = c.invoices.filter((i) => i.status === 'PAID');
      const totalPaid = paidInvoices.reduce(
        (acc, curr) => acc + curr.totalAmount.toNumber(),
        0,
      );
      return {
        id: c.id,
        name: c.name,
        email: c.email || '',
        wallet: c.walletAddress || '',
        invoicesCount: c.invoices.length,
        totalPaid: totalPaid.toFixed(2),
        status: 'ACTIVE',
        createdAt: c.createdAt.toISOString().substring(0, 10),
      };
    });
  }

  async findOne(userId: string, id: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new NotFoundException('No merchant associated');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id, merchantId: membership.merchantId },
      include: {
        invoices: {
          include: {
            asset: true,
            payments: {
              include: {
                asset: true,
                invoice: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const paidInvoices = customer.invoices.filter((i) => i.status === 'PAID');
    const totalPaid = paidInvoices.reduce(
      (acc, curr) => acc + curr.totalAmount.toNumber(),
      0,
    );

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      wallet: customer.walletAddress || '',
      notes: customer.notes || '',
      invoicesCount: customer.invoices.length,
      totalPaid: totalPaid.toFixed(2),
      status: 'ACTIVE',
      createdAt: customer.createdAt.toISOString().substring(0, 10),
      invoices: customer.invoices.map((invoice) => ({
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
        customerName: customer.name,
        customerEmail: customer.email || '',
        customerWallet: customer.walletAddress || '',
        destinationWallet: invoice.destinationWallet,
        createdAt: invoice.createdAt.toISOString().substring(0, 10),
        items: [],
      })),
      payments: customer.invoices.flatMap((invoice) =>
        invoice.payments.map((payment) => ({
          id: payment.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
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
        })),
      ),
    };
  }

  async update(
    userId: string,
    id: string,
    data: {
      name?: string;
      email?: string;
      walletAddress?: string;
      notes?: string;
    },
  ) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new NotFoundException('No merchant associated');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id, merchantId: membership.merchantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async remove(userId: string, id: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new NotFoundException('No merchant associated');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id, merchantId: membership.merchantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await this.prisma.customer.delete({ where: { id } });
  }
}
