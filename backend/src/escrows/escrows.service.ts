import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsService } from '../contracts/contracts.service';
import { SorobanService } from '../stellar/soroban.service';
import { StellarService } from '../stellar/stellar.service';

type EscrowAction = 'release' | 'refund' | 'open_dispute' | 'resolve_dispute';
type EscrowInvoiceTiming = { dueAt?: Date | null };
type EscrowAssetConfig = {
  code: string;
  assetType: string;
  contractId?: string | null;
};
type HumanizedContractEvent = {
  contractId?: string;
  topics?: unknown[];
  data?: unknown;
};

@Injectable()
export class EscrowsService {
  private readonly logger = new Logger(EscrowsService.name);

  constructor(
    private prisma: PrismaService,
    private contractsService: ContractsService,
    private sorobanService: SorobanService,
    private stellarService: StellarService,
  ) {}

  private requirePaymentEscrowContract() {
    const contractId = this.contractsService.getPaymentEscrowContractId();
    this.contractsService.requireContract(contractId, 'Payment Escrow');
    this.sorobanService.validateContractId(contractId);
    return contractId;
  }

  private async getMerchantMembership(userId: string) {
    const membership = await this.prisma.merchantMember.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new NotFoundException('No merchant account found');
    }
    return membership;
  }

  private async getEscrow(id: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            merchant: true,
            asset: true,
            payments: { include: { asset: true } },
          },
        },
        asset: true,
        blockchainTxs: { orderBy: { createdAt: 'desc' } },
        disputes: true,
      },
    });
    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }
    return escrow;
  }

  private async getMerchantEscrow(userId: string, id: string) {
    const membership = await this.getMerchantMembership(userId);
    const escrow = await this.prisma.escrow.findFirst({
      where: { id, invoice: { merchantId: membership.merchantId } },
      include: {
        invoice: {
          include: {
            merchant: true,
            asset: true,
            payments: { include: { asset: true } },
          },
        },
        asset: true,
        blockchainTxs: { orderBy: { createdAt: 'desc' } },
        disputes: true,
      },
    });
    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }
    return escrow;
  }

  private getReleaseDeadline(invoice: EscrowInvoiceTiming) {
    if (invoice.dueAt && invoice.dueAt > new Date()) {
      return invoice.dueAt;
    }
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private getAssetContractId(asset: EscrowAssetConfig) {
    const contractId = asset.contractId;
    if (contractId) {
      this.sorobanService.validateContractId(contractId);
      return contractId;
    }
    if (asset.code === 'XLM' && asset.assetType === 'NATIVE') {
      return this.sorobanService.getNativeAssetContractId();
    }
    throw new ServiceUnavailableException(
      `${asset.code} Soroban token contract ID is not configured`,
    );
  }

  private escrowArgs(escrow: any, invoice: any) {
    return [
      this.sorobanService.bytesN32(escrow.onChainEscrowId),
      this.sorobanService.bytesN32(
        invoice.onChainInvoiceId ||
          this.sorobanService.bytesN32Hex(`invoice:${invoice.id}`),
      ),
      this.sorobanService.address(escrow.payerWallet),
      this.sorobanService.address(escrow.merchantWallet),
      this.sorobanService.address(this.getAssetContractId(invoice.asset)),
      this.sorobanService.i128(
        this.sorobanService.amountToStroops(invoice.totalAmount.toString()),
      ),
      this.sorobanService.u64(
        escrow.releaseDeadline || this.getReleaseDeadline(invoice),
      ),
    ];
  }

  private formatPayment(payment: any) {
    return {
      id: payment.id,
      invoiceId: payment.invoice?.id || payment.invoiceId,
      invoiceNumber: payment.invoice?.invoiceNumber,
      amount: payment.paidAmount?.toFixed
        ? payment.paidAmount.toFixed(2)
        : payment.expectedAmount.toFixed(2),
      asset: payment.asset?.code || payment.invoice?.asset?.code || 'XLM',
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
        ? this.stellarService.getTransactionExplorerUrl(payment.transactionHash)
        : null,
      receiptUrl: `/receipt/${payment.id}`,
    };
  }

  private toPrismaJson(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    const safeValue = this.sorobanService.toJsonSafe(value);
    return safeValue === null
      ? Prisma.JsonNull
      : (safeValue as Prisma.InputJsonValue);
  }

  private formatRemainingBalance(value: unknown) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint'
    ) {
      return this.sorobanService.stroopsToAmount(value);
    }
    return null;
  }

  private formatEscrow(escrow: any) {
    return {
      id: escrow.id,
      invoiceId: escrow.invoiceId,
      invoiceNumber: escrow.invoice?.invoiceNumber,
      contractId: escrow.contractId,
      onChainEscrowId: escrow.onChainEscrowId,
      payerWallet: escrow.payerWallet,
      merchantWallet: escrow.merchantWallet,
      amount: escrow.amount.toFixed(2),
      asset: escrow.asset?.code || escrow.invoice?.asset?.code || 'XLM',
      platformFee: escrow.platformFee.toFixed(7),
      status: escrow.status,
      releaseDeadline: escrow.releaseDeadline
        ? escrow.releaseDeadline.toISOString()
        : null,
      fundedTxHash: escrow.fundedTxHash,
      releaseTxHash: escrow.releaseTxHash,
      refundTxHash: escrow.refundTxHash,
      fundedAt: escrow.fundedAt ? escrow.fundedAt.toISOString() : null,
      releasedAt: escrow.releasedAt ? escrow.releasedAt.toISOString() : null,
      refundedAt: escrow.refundedAt ? escrow.refundedAt.toISOString() : null,
      transactions: (escrow.blockchainTxs || []).map((tx: any) => ({
        id: tx.id,
        kind: tx.kind,
        status: tx.status,
        sourceAccount: tx.sourceAccount,
        transactionHash: tx.transactionHash,
        ledger: tx.ledger ? Number(tx.ledger) : null,
        createdAt: tx.createdAt.toISOString(),
      })),
      disputes: escrow.disputes || [],
    };
  }

  private async saveContractEvents(
    contractId: string,
    result: { hash: string; ledger: number; events: unknown[] },
    invoiceId?: string | null,
    escrowId?: string | null,
  ) {
    for (const [index, rawEvent] of (result.events || []).entries()) {
      const event = rawEvent as HumanizedContractEvent;
      const topics = Array.isArray(event.topics) ? event.topics : [];
      const data = event.data ?? null;
      const eventType =
        typeof topics[0] === 'string' ? topics[0] : 'contract_event';
      await this.prisma.contractEvent.upsert({
        where: {
          transactionHash_eventIndex: {
            transactionHash: result.hash,
            eventIndex: index,
          },
        },
        create: {
          contractId: event.contractId || contractId,
          transactionHash: result.hash,
          ledger: BigInt(result.ledger),
          eventIndex: index,
          eventType,
          topics: this.toPrismaJson(topics),
          data: this.toPrismaJson(data),
          invoiceId: invoiceId || null,
          escrowId: escrowId || null,
          processedAt: new Date(),
        },
        update: {
          eventType,
          topics: this.toPrismaJson(topics),
          data: this.toPrismaJson(data),
          processedAt: new Date(),
        },
      });
    }
  }

  private async latestTx(escrowId: string, kind: any, paymentId?: string) {
    return this.prisma.blockchainTransaction.findFirst({
      where: {
        escrowId,
        kind,
        ...(paymentId ? { paymentId } : {}),
        status: {
          in: ['AWAITING_SIGNATURE', 'SIGNED', 'SUBMITTED', 'PENDING'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, id: string) {
    return this.formatEscrow(await this.getMerchantEscrow(userId, id));
  }

  async onChainState(userId: string, id: string) {
    const escrow = await this.getMerchantEscrow(userId, id);
    const db = this.formatEscrow(escrow);
    const contractId = this.requirePaymentEscrowContract();
    const source = escrow.payerWallet || escrow.merchantWallet;

    const [escrowState, remainingBalance] = await Promise.all([
      this.sorobanService.simulateInvocation({
        source,
        contractId,
        functionName: 'get_escrow',
        args: [this.sorobanService.bytesN32(escrow.onChainEscrowId)],
      }),
      this.sorobanService.simulateInvocation({
        source,
        contractId,
        functionName: 'get_balance',
        args: [this.sorobanService.bytesN32(escrow.onChainEscrowId)],
      }),
    ]);

    return {
      db,
      contract: {
        escrow: escrowState,
        remainingBalanceStroops: remainingBalance,
        remainingBalance: this.formatRemainingBalance(remainingBalance),
      },
    };
  }

  async createIntent(publicToken: string, payerWallet: string) {
    this.stellarService.validatePublicKey(payerWallet);
    const contractId = this.requirePaymentEscrowContract();

    const invoice = await this.prisma.invoice.findUnique({
      where: { publicToken },
      include: {
        asset: true,
        merchant: { include: { defaultWallet: true } },
        escrow: { include: { blockchainTxs: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.paymentType !== 'ESCROW') {
      throw new BadRequestException('This invoice is not an escrow invoice');
    }
    if (invoice.status !== 'OPEN') {
      throw new BadRequestException('Invoice is not open for escrow funding');
    }

    const existingConfirmedPayment = await this.prisma.payment.findFirst({
      where: {
        invoiceId: invoice.id,
        paymentType: 'ESCROW',
        status: 'CONFIRMED',
      },
    });
    if (existingConfirmedPayment) {
      throw new BadRequestException('Escrow invoice is already funded');
    }

    const onChainEscrowId = this.sorobanService.bytesN32Hex(
      `escrow:${invoice.id}:${payerWallet}`,
    );
    const releaseDeadline = this.getReleaseDeadline(invoice);
    const feeBps = this.contractsService.getConfig().feeBps || 0;
    const platformFee =
      (invoice.totalAmount.toNumber() * Math.max(feeBps, 0)) / 10000;

    let escrow = invoice.escrow;
    if (escrow && escrow.payerWallet !== payerWallet) {
      throw new BadRequestException(
        'This escrow invoice was already prepared for another payer wallet',
      );
    }

    if (!escrow) {
      escrow = await this.prisma.escrow.create({
        data: {
          invoiceId: invoice.id,
          contractId,
          onChainEscrowId,
          payerWallet,
          merchantWallet: invoice.destinationWallet,
          assetId: invoice.assetId,
          amount: invoice.totalAmount,
          platformFee,
          status: 'CREATED',
          releaseDeadline,
        },
        include: { blockchainTxs: true },
      });
    }

    const createSuccess = await this.prisma.blockchainTransaction.findFirst({
      where: {
        escrowId: escrow.id,
        kind: 'CONTRACT_CREATE',
        status: 'SUCCESS',
      },
      orderBy: { confirmedAt: 'desc' },
    });

    if (createSuccess) {
      return {
        id: escrow.id,
        escrowId: escrow.id,
        invoiceId: invoice.id,
        needsCreate: false,
        network: this.stellarService.getNetwork(),
        networkPassphrase: this.sorobanService.getNetworkPassphrase(),
        contractId,
        onChainEscrowId: escrow.onChainEscrowId,
        amount: invoice.totalAmount.toFixed(2),
        asset: invoice.asset.code,
      };
    }

    const prepared = await this.sorobanService.buildInvocation({
      source: payerWallet,
      contractId,
      functionName: 'create_escrow',
      args: this.escrowArgs(escrow, invoice),
    });

    const blockchainTx = await this.prisma.blockchainTransaction.create({
      data: {
        invoiceId: invoice.id,
        escrowId: escrow.id,
        kind: 'CONTRACT_CREATE',
        network: this.stellarService.getNetwork(),
        sourceAccount: payerWallet,
        unsignedXdr: prepared.unsignedXdr,
        status: 'AWAITING_SIGNATURE',
      },
    });

    return {
      id: escrow.id,
      escrowId: escrow.id,
      invoiceId: invoice.id,
      blockchainTxId: blockchainTx.id,
      needsCreate: true,
      unsignedXdr: prepared.unsignedXdr,
      network: prepared.network,
      networkPassphrase: prepared.networkPassphrase,
      contractId,
      onChainEscrowId: escrow.onChainEscrowId,
      amount: invoice.totalAmount.toFixed(2),
      asset: invoice.asset.code,
      expiresAt: prepared.expiresAt,
    };
  }

  async submitCreate(id: string, signedXdr: string, payerWallet: string) {
    this.stellarService.validatePublicKey(payerWallet);
    const escrow = await this.getEscrow(id);
    if (escrow.payerWallet !== payerWallet) {
      throw new BadRequestException('Escrow payer wallet mismatch');
    }

    this.sorobanService.verifyContractCall(signedXdr, {
      source: payerWallet,
      contractId: escrow.contractId,
      functionName: 'create_escrow',
      firstArgHex: escrow.onChainEscrowId,
      argCount: 7,
    });

    const blockchainTx = await this.latestTx(escrow.id, 'CONTRACT_CREATE');
    if (blockchainTx) {
      await this.prisma.blockchainTransaction.update({
        where: { id: blockchainTx.id },
        data: { signedXdr, status: 'SUBMITTED', submittedAt: new Date() },
      });
    }

    try {
      const result = await this.sorobanService.submitAndPoll(signedXdr);
      await this.prisma.$transaction([
        ...(blockchainTx
          ? [
              this.prisma.blockchainTransaction.update({
                where: { id: blockchainTx.id },
                data: {
                  signedXdr,
                  transactionHash: result.hash,
                  status: 'SUCCESS',
                  ledger: BigInt(result.ledger),
                  feeCharged: BigInt(result.fee),
                  resultCode: 'tx_success',
                  resultXdr: result.resultXdr,
                  confirmedAt: result.createdAt,
                },
              }),
            ]
          : []),
        this.prisma.auditLog.create({
          data: {
            merchantId: escrow.invoice.merchantId,
            action: 'escrow.created_on_chain',
            entityType: 'escrow',
            entityId: escrow.id,
            metadata: { transactionHash: result.hash },
          },
        }),
      ]);
      await this.saveContractEvents(
        escrow.contractId,
        result,
        escrow.invoiceId,
        escrow.id,
      );
      return {
        escrowId: escrow.id,
        transactionHash: result.hash,
        explorerUrl: this.stellarService.getTransactionExplorerUrl(result.hash),
      };
    } catch (e) {
      await this.markBlockchainTxFailed(blockchainTx?.id, e);
      throw e;
    }
  }

  async prepareDeposit(id: string, payerWallet: string) {
    this.stellarService.validatePublicKey(payerWallet);
    const escrow = await this.getEscrow(id);
    if (escrow.payerWallet !== payerWallet) {
      throw new BadRequestException('Escrow payer wallet mismatch');
    }
    if (escrow.status !== 'CREATED') {
      throw new BadRequestException(`Escrow is ${escrow.status.toLowerCase()}`);
    }

    const createSuccess = await this.prisma.blockchainTransaction.findFirst({
      where: {
        escrowId: escrow.id,
        kind: 'CONTRACT_CREATE',
        status: 'SUCCESS',
      },
    });
    if (!createSuccess) {
      throw new BadRequestException(
        'Create the escrow on-chain before deposit',
      );
    }

    const prepared = await this.sorobanService.buildInvocation({
      source: payerWallet,
      contractId: escrow.contractId,
      functionName: 'deposit',
      args: [this.sorobanService.bytesN32(escrow.onChainEscrowId)],
    });

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: escrow.invoiceId,
        assetId: escrow.assetId,
        payerWallet,
        receiverWallet: escrow.contractId,
        expectedAmount: escrow.amount,
        paidAmount: 0,
        direction: 'INCOMING',
        paymentType: 'ESCROW',
        status: 'AWAITING_SIGNATURE',
        memo: escrow.invoice.memo,
        sourceAccount: payerWallet,
      },
    });

    const blockchainTx = await this.prisma.blockchainTransaction.create({
      data: {
        invoiceId: escrow.invoiceId,
        paymentId: payment.id,
        escrowId: escrow.id,
        kind: 'ESCROW_DEPOSIT',
        network: this.stellarService.getNetwork(),
        sourceAccount: payerWallet,
        unsignedXdr: prepared.unsignedXdr,
        status: 'AWAITING_SIGNATURE',
      },
    });

    return {
      id: payment.id,
      paymentId: payment.id,
      escrowId: escrow.id,
      blockchainTxId: blockchainTx.id,
      unsignedXdr: prepared.unsignedXdr,
      network: prepared.network,
      networkPassphrase: prepared.networkPassphrase,
      amount: escrow.amount.toFixed(2),
      asset: escrow.asset.code,
      contractId: escrow.contractId,
      expiresAt: prepared.expiresAt,
    };
  }

  async submitDeposit(
    id: string,
    signedXdr: string,
    payerWallet: string,
    paymentIntentId?: string,
  ) {
    this.stellarService.validatePublicKey(payerWallet);
    const escrow = await this.getEscrow(id);
    if (escrow.payerWallet !== payerWallet) {
      throw new BadRequestException('Escrow payer wallet mismatch');
    }

    this.sorobanService.verifyContractCall(signedXdr, {
      source: payerWallet,
      contractId: escrow.contractId,
      functionName: 'deposit',
      firstArgHex: escrow.onChainEscrowId,
      argCount: 1,
    });

    const payment = paymentIntentId
      ? await this.prisma.payment.findFirst({
          where: { id: paymentIntentId, invoiceId: escrow.invoiceId },
          include: { asset: true, invoice: true },
        })
      : await this.prisma.payment.findFirst({
          where: {
            invoiceId: escrow.invoiceId,
            payerWallet,
            paymentType: 'ESCROW',
            status: {
              in: ['AWAITING_SIGNATURE', 'SIGNED', 'SUBMITTED', 'PENDING'],
            },
          },
          include: { asset: true, invoice: true },
          orderBy: { createdAt: 'desc' },
        });
    if (!payment) {
      throw new NotFoundException('Escrow payment intent not found');
    }

    const blockchainTx = await this.latestTx(
      escrow.id,
      'ESCROW_DEPOSIT',
      payment.id,
    );
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      }),
      ...(blockchainTx
        ? [
            this.prisma.blockchainTransaction.update({
              where: { id: blockchainTx.id },
              data: { signedXdr, status: 'SUBMITTED', submittedAt: new Date() },
            }),
          ]
        : []),
    ]);

    try {
      const result = await this.sorobanService.submitAndPoll(signedXdr);
      const confirmed = await this.prisma.$transaction(async (tx) => {
        const savedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            paidAmount: escrow.amount,
            status: 'CONFIRMED',
            transactionHash: result.hash,
            ledger: BigInt(result.ledger),
            feeCharged: BigInt(result.fee),
            resultCode: 'tx_success',
            submittedAt: new Date(),
            confirmedAt: result.createdAt,
            ledgerClosedAt: result.createdAt,
          },
          include: { invoice: true, asset: true },
        });

        if (blockchainTx) {
          await tx.blockchainTransaction.update({
            where: { id: blockchainTx.id },
            data: {
              signedXdr,
              transactionHash: result.hash,
              status: 'SUCCESS',
              ledger: BigInt(result.ledger),
              feeCharged: BigInt(result.fee),
              resultCode: 'tx_success',
              resultXdr: result.resultXdr,
              confirmedAt: result.createdAt,
            },
          });
        }

        await tx.escrow.update({
          where: { id: escrow.id },
          data: {
            status: 'FUNDED',
            fundedTxHash: result.hash,
            fundedAt: result.createdAt,
          },
        });

        await tx.invoice.update({
          where: { id: escrow.invoiceId },
          data: {
            status: 'PAYMENT_PENDING',
            amountPaid: escrow.amount,
          },
        });

        await tx.auditLog.create({
          data: {
            merchantId: escrow.invoice.merchantId,
            action: 'escrow.funded',
            entityType: 'escrow',
            entityId: escrow.id,
            metadata: {
              paymentId: payment.id,
              transactionHash: result.hash,
            },
          },
        });

        return savedPayment;
      });
      await this.saveContractEvents(
        escrow.contractId,
        result,
        escrow.invoiceId,
        escrow.id,
      );
      return this.formatPayment(confirmed);
    } catch (e) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failureReason: e instanceof Error ? e.message : 'Deposit failed',
          },
        }),
        ...(blockchainTx
          ? [
              this.prisma.blockchainTransaction.update({
                where: { id: blockchainTx.id },
                data: {
                  status: 'FAILED',
                  errorMessage:
                    e instanceof Error ? e.message : 'Deposit failed',
                },
              }),
            ]
          : []),
      ]);
      throw e;
    }
  }

  async prepareAction(id: string, action: EscrowAction, body: any) {
    const escrow = await this.getEscrow(id);
    const sourceWallet = String(body?.sourceWallet || '').trim();
    this.stellarService.validatePublicKey(sourceWallet);
    const { functionName, args, kind } = this.actionSpec(escrow, action, body);

    const prepared = await this.sorobanService.buildInvocation({
      source: sourceWallet,
      contractId: escrow.contractId,
      functionName,
      args,
    });

    const blockchainTx = await this.prisma.blockchainTransaction.create({
      data: {
        invoiceId: escrow.invoiceId,
        escrowId: escrow.id,
        kind,
        network: this.stellarService.getNetwork(),
        sourceAccount: sourceWallet,
        unsignedXdr: prepared.unsignedXdr,
        status: 'AWAITING_SIGNATURE',
      },
    });

    return {
      escrowId: escrow.id,
      blockchainTxId: blockchainTx.id,
      unsignedXdr: prepared.unsignedXdr,
      network: prepared.network,
      networkPassphrase: prepared.networkPassphrase,
      contractId: escrow.contractId,
      functionName,
      expiresAt: prepared.expiresAt,
    };
  }

  async submitAction(id: string, action: EscrowAction, body: any) {
    const escrow = await this.getEscrow(id);
    const sourceWallet = String(body?.sourceWallet || '').trim();
    this.stellarService.validatePublicKey(sourceWallet);
    const { functionName, kind } = this.actionSpec(escrow, action, body);

    this.sorobanService.verifyContractCall(body.signedXdr, {
      source: sourceWallet,
      contractId: escrow.contractId,
      functionName,
      firstArgHex: escrow.onChainEscrowId,
    });

    const blockchainTx = await this.latestTx(escrow.id, kind);
    if (blockchainTx) {
      await this.prisma.blockchainTransaction.update({
        where: { id: blockchainTx.id },
        data: {
          signedXdr: body.signedXdr,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
    }

    try {
      const result = await this.sorobanService.submitAndPoll(body.signedXdr);
      const data = this.dataForSuccessfulAction(action, result);
      await this.prisma.$transaction([
        this.prisma.escrow.update({
          where: { id: escrow.id },
          data: data.escrow,
        }),
        this.prisma.invoice.update({
          where: { id: escrow.invoiceId },
          data: data.invoice,
        }),
        ...(action === 'refund'
          ? [
              this.prisma.payment.updateMany({
                where: {
                  invoiceId: escrow.invoiceId,
                  paymentType: 'ESCROW',
                  status: 'CONFIRMED',
                },
                data: { status: 'REVERSED' },
              }),
            ]
          : []),
        ...(blockchainTx
          ? [
              this.prisma.blockchainTransaction.update({
                where: { id: blockchainTx.id },
                data: {
                  signedXdr: body.signedXdr,
                  transactionHash: result.hash,
                  status: 'SUCCESS',
                  ledger: BigInt(result.ledger),
                  feeCharged: BigInt(result.fee),
                  resultCode: 'tx_success',
                  resultXdr: result.resultXdr,
                  confirmedAt: result.createdAt,
                },
              }),
            ]
          : []),
        this.prisma.auditLog.create({
          data: {
            merchantId: escrow.invoice.merchantId,
            action: `escrow.${action}`,
            entityType: 'escrow',
            entityId: escrow.id,
            metadata: { transactionHash: result.hash },
          },
        }),
      ]);
      await this.saveContractEvents(
        escrow.contractId,
        result,
        escrow.invoiceId,
        escrow.id,
      );
      return {
        escrowId: escrow.id,
        status: data.escrow.status,
        transactionHash: result.hash,
        explorerUrl: this.stellarService.getTransactionExplorerUrl(result.hash),
      };
    } catch (e) {
      await this.markBlockchainTxFailed(blockchainTx?.id, e);
      throw e;
    }
  }

  private actionSpec(escrow: any, action: EscrowAction, body: any) {
    const sourceWallet = String(body?.sourceWallet || '').trim();
    const escrowIdArg = this.sorobanService.bytesN32(escrow.onChainEscrowId);

    if (action === 'release') {
      if (sourceWallet !== escrow.payerWallet) {
        throw new BadRequestException('Escrow release requires payer wallet');
      }
      return {
        functionName: 'release',
        kind: 'ESCROW_RELEASE' as const,
        args: [escrowIdArg],
      };
    }

    if (action === 'refund') {
      const afterDeadline =
        escrow.releaseDeadline && new Date() > escrow.releaseDeadline;
      const expected = afterDeadline
        ? escrow.payerWallet
        : escrow.merchantWallet;
      if (sourceWallet !== expected) {
        throw new BadRequestException(
          afterDeadline
            ? 'Escrow refund after deadline requires payer wallet'
            : 'Escrow refund before deadline requires merchant wallet',
        );
      }
      return {
        functionName: 'refund',
        kind: 'ESCROW_REFUND' as const,
        args: [escrowIdArg],
      };
    }

    if (action === 'open_dispute') {
      if (sourceWallet !== escrow.payerWallet) {
        throw new BadRequestException(
          'Opening a dispute requires payer wallet',
        );
      }
      const evidenceHash = this.sorobanService.bytesN32Hex(
        body?.evidenceHash ||
          `${body?.reason || 'dispute'}:${body?.description || ''}`,
      );
      return {
        functionName: 'open_dispute',
        kind: 'DISPUTE_OPEN' as const,
        args: [escrowIdArg, this.sorobanService.bytesN32(evidenceHash)],
      };
    }

    const admin = this.contractsService.getContractAdminPublicKey();
    if (!admin) {
      throw new ServiceUnavailableException(
        'CONTRACT_ADMIN_PUBLIC_KEY is required to resolve disputes',
      );
    }
    if (sourceWallet !== admin) {
      throw new BadRequestException('Dispute resolution requires admin wallet');
    }
    return {
      functionName: 'resolve_dispute',
      kind: 'DISPUTE_RESOLVE' as const,
      args: [
        escrowIdArg,
        this.sorobanService.i128(
          this.sorobanService.amountToStroops(body?.merchantAmount || '0'),
        ),
        this.sorobanService.i128(
          this.sorobanService.amountToStroops(body?.payerAmount || '0'),
        ),
      ],
    };
  }

  private dataForSuccessfulAction(action: EscrowAction, result: any) {
    if (action === 'release') {
      return {
        escrow: {
          status: 'RELEASED' as const,
          releaseTxHash: result.hash,
          releasedAt: result.createdAt,
        },
        invoice: { status: 'PAID' as const, paidAt: result.createdAt },
      };
    }
    if (action === 'refund') {
      return {
        escrow: {
          status: 'REFUNDED' as const,
          refundTxHash: result.hash,
          refundedAt: result.createdAt,
        },
        invoice: { status: 'REFUNDED' as const },
      };
    }
    if (action === 'open_dispute') {
      return {
        escrow: { status: 'DISPUTED' as const },
        invoice: { status: 'DISPUTED' as const },
      };
    }
    return {
      escrow: { status: 'RESOLVED' as const },
      invoice: { status: 'PAID' as const, paidAt: result.createdAt },
    };
  }

  private async markBlockchainTxFailed(id: string | undefined, error: unknown) {
    if (!id) return;
    const message =
      error instanceof Error ? error.message : 'Soroban transaction failed';
    await this.prisma.blockchainTransaction.update({
      where: { id },
      data: { status: 'FAILED', errorMessage: message },
    });
  }
}
