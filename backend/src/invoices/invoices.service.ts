import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SorobanService } from '../stellar/soroban.service';
import { StellarService } from '../stellar/stellar.service';
import { ContractsService } from '../contracts/contracts.service';
import * as crypto from 'crypto';

interface InvoiceItemInput {
  name?: string;
  description?: string;
  quantity: number;
  unitPrice: string;
}

interface InvoiceInput {
  title: string;
  description?: string;
  customerId?: string;
  customer?: {
    name: string;
    email?: string;
    walletAddress?: string;
  };
  amount?: string;
  dueDate?: string;
  memo?: string;
  paymentType?: 'DIRECT' | 'ESCROW' | 'MILESTONE';
  destinationWallet?: string;
  open?: boolean;
  items: InvoiceItemInput[];
}

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private sorobanService: SorobanService,
    private stellarService: StellarService,
    private contractsService: ContractsService,
  ) {}

  private getCheckoutUrl(publicToken: string) {
    const frontendUrl = (
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ).replace(/\/$/, '');
    return `${frontendUrl}/pay/${publicToken}`;
  }

  private async getMembership(userId: string) {
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
      throw new NotFoundException('No merchant account found');
    }

    return membership;
  }

  private async getNativeAsset() {
    const asset = await this.prisma.supportedAsset.findFirst({
      where: { code: 'XLM', network: 'TESTNET', isActive: true },
    });
    if (!asset) {
      throw new BadRequestException(
        'XLM native asset is not configured in database',
      );
    }
    return asset;
  }

  private calculateItems(items: InvoiceItemInput[]) {
    if (!items?.length) {
      throw new BadRequestException('At least one invoice item is required');
    }

    return items.map((item, idx) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number.parseFloat(item.unitPrice);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new BadRequestException(`Invalid quantity for item ${idx + 1}`);
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new BadRequestException(`Invalid unit price for item ${idx + 1}`);
      }

      const name = item.description || item.name;
      if (!name?.trim()) {
        throw new BadRequestException(
          `Missing description for item ${idx + 1}`,
        );
      }

      return {
        name: name.trim(),
        description: item.description || item.name || '',
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        position: idx,
      };
    });
  }

  private async generateInvoiceNumber() {
    const year = new Date().getUTCFullYear();
    let sequence = (await this.prisma.invoice.count()) + 1;

    while (true) {
      const invoiceNumber = `LM-${year}-${sequence.toString().padStart(6, '0')}`;
      const existing = await this.prisma.invoice.findUnique({
        where: { invoiceNumber },
        select: { id: true },
      });
      if (!existing) {
        return invoiceNumber;
      }
      sequence += 1;
    }
  }

  private formatInvoice(invoice: any) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      publicToken: invoice.publicToken,
      title: invoice.title,
      description: invoice.description || '',
      amount: invoice.totalAmount.toFixed(2),
      asset: invoice.asset?.code || 'XLM',
      dueDate: invoice.dueAt
        ? invoice.dueAt.toISOString().substring(0, 10)
        : '',
      memo: invoice.memo,
      status: invoice.status,
      paymentType: invoice.paymentType,
      customerName: invoice.customer
        ? invoice.customer.name
        : 'Unknown Customer',
      customerEmail: invoice.customer ? invoice.customer.email || '' : '',
      customerWallet: invoice.customer
        ? invoice.customer.walletAddress || ''
        : '',
      destinationWallet: invoice.destinationWallet,
      createdAt: invoice.createdAt.toISOString().substring(0, 10),
      paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
      merchantName: invoice.merchant?.businessName,
      checkoutUrl: this.getCheckoutUrl(invoice.publicToken),
      items: (invoice.items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || item.name,
        quantity: item.quantity.toNumber(),
        unitPrice: item.unitPrice.toFixed(2),
        totalPrice: item.totalPrice.toFixed(2),
      })),
      payments: (invoice.payments || []).map((payment: any) => ({
        id: payment.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: payment.paidAmount.toFixed(2),
        asset: payment.asset?.code || invoice.asset?.code || 'XLM',
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
      escrow: invoice.escrow
        ? {
            id: invoice.escrow.id,
            contractId: invoice.escrow.contractId,
            onChainEscrowId: invoice.escrow.onChainEscrowId,
            payerWallet: invoice.escrow.payerWallet,
            merchantWallet: invoice.escrow.merchantWallet,
            amount: invoice.escrow.amount.toFixed(2),
            status: invoice.escrow.status,
            releaseDeadline: invoice.escrow.releaseDeadline
              ? invoice.escrow.releaseDeadline.toISOString()
              : null,
            fundedTxHash: invoice.escrow.fundedTxHash,
            releaseTxHash: invoice.escrow.releaseTxHash,
            refundTxHash: invoice.escrow.refundTxHash,
            fundedAt: invoice.escrow.fundedAt
              ? invoice.escrow.fundedAt.toISOString()
              : null,
            releasedAt: invoice.escrow.releasedAt
              ? invoice.escrow.releasedAt.toISOString()
              : null,
            refundedAt: invoice.escrow.refundedAt
              ? invoice.escrow.refundedAt.toISOString()
              : null,
          }
        : null,
    };
  }

  async create(userId: string, data: InvoiceInput) {
    const membership = await this.getMembership(userId);
    const merchant = membership.merchant;
    const asset = await this.getNativeAsset();
    const calculatedItems = this.calculateItems(data.items);
    const subtotal = calculatedItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );
    const paymentType = data.paymentType || 'DIRECT';

    if (paymentType === 'ESCROW' && !process.env.PAYMENT_ESCROW_CONTRACT_ID) {
      throw new BadRequestException(
        'Escrow invoice creation requires PAYMENT_ESCROW_CONTRACT_ID',
      );
    }

    let customerId = data.customerId || null;
    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, merchantId: merchant.id },
      });
      if (!customer) {
        throw new BadRequestException(
          'Customer does not belong to current merchant',
        );
      }
    } else if (data.customer?.name) {
      const customer = await this.prisma.customer.create({
        data: {
          merchantId: merchant.id,
          name: data.customer.name,
          email: data.customer.email,
          walletAddress: data.customer.walletAddress,
        },
      });
      customerId = customer.id;
    }

    const invoiceNumber = await this.generateInvoiceNumber();
    const publicToken = crypto.randomBytes(16).toString('hex');
    const memo = (data.memo?.trim() || invoiceNumber).slice(0, 28);

    const invoice = await this.prisma.invoice.create({
      data: {
        merchantId: merchant.id,
        customerId,
        invoiceNumber,
        publicToken,
        title: data.title,
        description: data.description || null,
        assetId: asset.id,
        subtotal,
        feeAmount: 0,
        totalAmount: subtotal,
        status: data.open === false ? 'DRAFT' : 'OPEN',
        paymentType,
        memo,
        destinationWallet:
          data.destinationWallet || merchant.defaultWallet.publicKey,
        dueAt: data.dueDate ? new Date(data.dueDate) : null,
        items: {
          create: calculatedItems,
        },
      },
      include: {
        customer: true,
        items: true,
        asset: true,
        merchant: true,
        payments: { include: { asset: true } },
        escrow: true,
      },
    });

    return this.formatInvoice(invoice);
  }

  async findAll(userId: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) return [];

    const invoices = await this.prisma.invoice.findMany({
      where: { merchantId: membership.merchantId },
      include: {
        customer: true,
        asset: true,
        items: true,
        merchant: true,
        payments: { include: { asset: true } },
        escrow: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((invoice) => this.formatInvoice(invoice));
  }

  async findOne(userId: string, id: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new NotFoundException('No merchant associated');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, merchantId: membership.merchantId },
      include: {
        customer: true,
        items: true,
        asset: true,
        merchant: true,
        payments: { include: { asset: true } },
        escrow: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.formatInvoice(invoice);
  }

  async findByPublicToken(publicToken: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { publicToken },
      include: {
        merchant: {
          include: {
            defaultWallet: true,
          },
        },
        customer: true,
        items: true,
        asset: true,
        payments: { include: { asset: true } },
        escrow: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.formatInvoice(invoice);
  }

  async update(userId: string, id: string, data: Partial<InvoiceInput>) {
    const membership = await this.getMembership(userId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, merchantId: membership.merchantId },
      include: { items: true },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (!['DRAFT', 'OPEN'].includes(invoice.status)) {
      throw new BadRequestException(
        'Only draft or open invoices can be edited',
      );
    }

    const updateData: any = {
      title: data.title,
      description: data.description,
      dueAt: data.dueDate ? new Date(data.dueDate) : undefined,
      memo: data.memo ? data.memo.slice(0, 28) : undefined,
      destinationWallet: data.destinationWallet,
    };

    if (data.items?.length) {
      const calculatedItems = this.calculateItems(data.items);
      const subtotal = calculatedItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      );
      updateData.subtotal = subtotal;
      updateData.totalAmount = subtotal;
      await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      updateData.items = { create: calculatedItems };
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: true,
        asset: true,
        merchant: true,
        payments: { include: { asset: true } },
        escrow: true,
      },
    });

    return this.formatInvoice(updated);
  }

  async open(userId: string, id: string) {
    const membership = await this.getMembership(userId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, merchantId: membership.merchantId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only draft invoices can be opened');
    }

    const opened = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'OPEN' },
      include: {
        customer: true,
        items: true,
        asset: true,
        merchant: true,
        payments: { include: { asset: true } },
        escrow: true,
      },
    });
    return this.formatInvoice(opened);
  }

  async duplicate(userId: string, id: string) {
    const source = await this.findOne(userId, id);
    return this.create(userId, {
      title: `${source.title} Copy`,
      description: source.description,
      customerId: undefined,
      customer: source.customerName
        ? {
            name: source.customerName,
            email: source.customerEmail,
            walletAddress: source.customerWallet,
          }
        : undefined,
      dueDate: source.dueDate,
      memo: source.memo,
      paymentType: source.paymentType === 'ESCROW' ? 'ESCROW' : 'DIRECT',
      destinationWallet: source.destinationWallet,
      open: false,
      items: source.items.map(
        (item: {
          description: string;
          quantity: number;
          unitPrice: string;
        }) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }),
      ),
    });
  }

  async cancel(userId: string, id: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new NotFoundException('No merchant associated');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, merchantId: membership.merchantId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!['OPEN', 'DRAFT'].includes(invoice.status)) {
      throw new BadRequestException(
        'Only open or draft invoices can be cancelled',
      );
    }

    const cancelled = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      include: {
        customer: true,
        items: true,
        asset: true,
        merchant: true,
        payments: { include: { asset: true } },
        escrow: true,
      },
    });

    return this.formatInvoice(cancelled);
  }

  private getInvoiceRegistryContractId() {
    const contractId = this.contractsService.getInvoiceRegistryContractId();
    this.contractsService.requireContract(contractId, 'Invoice Registry');
    this.sorobanService.validateContractId(contractId);
    return contractId;
  }

  async prepareOnChainRegistry(userId: string, id: string, sourceWallet?: string) {
    const membership = await this.getMembership(userId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, merchantId: membership.merchantId },
      include: { customer: true, asset: true, items: true },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const contractId = this.getInvoiceRegistryContractId();
    const source = sourceWallet || membership.merchant.defaultWallet?.publicKey;
    if (!source) {
      throw new BadRequestException('Source wallet address is required');
    }
    this.stellarService.validatePublicKey(source);

    const onChainInvoiceId = this.sorobanService.bytesN32Hex(`invoice:${invoice.id}`);
    const metadataHash = this.sorobanService.bytesN32Hex(
      this.sorobanService.hashJson({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        title: invoice.title,
        amount: invoice.totalAmount.toString(),
      }),
    );

    const assetContractId =
      invoice.asset.contractId ||
      (invoice.asset.code === 'XLM'
        ? this.sorobanService.getNativeAssetContractId()
        : null);
    if (!assetContractId) {
      throw new BadRequestException('Asset contract ID is not configured');
    }

    const customerScVal = invoice.customer?.walletAddress
      ? this.sorobanService.address(invoice.customer.walletAddress)
      : this.sorobanService.address(invoice.destinationWallet);

    const prepared = await this.sorobanService.buildInvocation({
      source,
      contractId,
      functionName: 'create_invoice',
      args: [
        this.sorobanService.bytesN32(onChainInvoiceId),
        this.sorobanService.address(invoice.destinationWallet),
        customerScVal,
        this.sorobanService.address(assetContractId),
        this.sorobanService.i128(
          this.sorobanService.amountToStroops(invoice.totalAmount.toString()),
        ),
        this.sorobanService.bytesN32(metadataHash),
        this.sorobanService.u64(invoice.dueAt || 0),
      ],
    });

    return {
      invoiceId: invoice.id,
      contractId,
      onChainInvoiceId,
      unsignedXdr: prepared.unsignedXdr,
      network: prepared.network,
      networkPassphrase: prepared.networkPassphrase,
      expiresAt: prepared.expiresAt,
    };
  }

  async submitOnChainRegistry(
    userId: string,
    id: string,
    signedXdr: string,
    sourceWallet: string,
  ) {
    const membership = await this.getMembership(userId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, merchantId: membership.merchantId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    const contractId = this.getInvoiceRegistryContractId();
    this.stellarService.validatePublicKey(sourceWallet);

    const onChainInvoiceId = this.sorobanService.bytesN32Hex(`invoice:${invoice.id}`);
    this.sorobanService.verifyContractCall(signedXdr, {
      source: sourceWallet,
      contractId,
      functionName: 'create_invoice',
      firstArgHex: onChainInvoiceId,
    });

    const result = await this.sorobanService.submitAndPoll(signedXdr);
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { onChainInvoiceId },
    });

    return {
      invoiceId: invoice.id,
      onChainInvoiceId,
      transactionHash: result.hash,
      explorerUrl: this.stellarService.getTransactionExplorerUrl(result.hash),
    };
  }

  async onChainRegistryState(userId: string, id: string) {
    const membership = await this.getMembership(userId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, merchantId: membership.merchantId },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    const contractId = this.getInvoiceRegistryContractId();
    const source = membership.merchant.defaultWallet?.publicKey;

    const onChainInvoiceId =
      invoice.onChainInvoiceId ||
      this.sorobanService.bytesN32Hex(`invoice:${invoice.id}`);

    const state = await this.sorobanService.simulateInvocation({
      source,
      contractId,
      functionName: 'get_invoice',
      args: [this.sorobanService.bytesN32(onChainInvoiceId)],
    });

    return {
      db: this.formatInvoice(invoice),
      contract: {
        contractId,
        onChainInvoiceId,
        record: state,
      },
    };
  }
}
