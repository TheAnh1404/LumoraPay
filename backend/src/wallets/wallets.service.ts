import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class WalletsService {
  constructor(
    private prisma: PrismaService,
    private stellarService: StellarService,
  ) {}

  async getBalance(address: string) {
    const balances = await this.stellarService.getBalances(address);
    const nativeBalance =
      balances.find((balance) => balance.asset === 'XLM')?.balance ||
      '0.0000000';
    return {
      address,
      network: this.stellarService.getNetwork(),
      nativeBalance,
      balances,
    };
  }

  async getTransactions(address: string) {
    this.stellarService.validatePublicKey(address);
    const [horizonPayments, dbPayments, dbTransactions] = await Promise.all([
      this.stellarService.getRecentAccountPayments(address, 20).catch(() => []),
      this.prisma.payment.findMany({
        where: {
          OR: [{ payerWallet: address }, { receiverWallet: address }],
        },
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.blockchainTransaction.findMany({
        where: { sourceAccount: address },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const dbHistory = dbPayments.map((payment) => ({
      id: payment.id,
      hash: payment.transactionHash || '',
      type: payment.paymentType === 'ESCROW' ? 'ESCROW_DEPOSIT' : 'XLM_PAYMENT',
      amount: payment.paidAmount.toFixed(2),
      asset: payment.asset.code,
      fromWallet: payment.payerWallet,
      toWallet: payment.receiverWallet,
      fee: payment.feeCharged
        ? (Number(payment.feeCharged) / 10000000).toFixed(7)
        : undefined,
      ledger: payment.ledger ? Number(payment.ledger) : undefined,
      timestamp: payment.confirmedAt
        ? payment.confirmedAt.toISOString()
        : payment.createdAt.toISOString(),
      status: payment.status,
      explorerUrl: payment.transactionHash
        ? this.stellarService.getTransactionExplorerUrl(payment.transactionHash)
        : null,
    }));

    const horizonHistory = horizonPayments.map((operation: any) => ({
      id: operation.id,
      hash: operation.transaction_hash,
      type: operation.type === 'payment' ? 'XLM_PAYMENT' : operation.type,
      amount: operation.amount,
      asset: operation.asset_type === 'native' ? 'XLM' : operation.asset_code,
      fromWallet: operation.from,
      toWallet: operation.to,
      ledger: operation.ledger,
      timestamp: operation.created_at,
      status: 'SUCCESS',
      explorerUrl: operation.transaction_hash
        ? this.stellarService.getTransactionExplorerUrl(
            operation.transaction_hash,
          )
        : null,
    }));

    const contractHistory = dbTransactions
      .filter((tx) => tx.kind !== 'CLASSIC_PAYMENT')
      .map((tx) => ({
        id: tx.id,
        hash: tx.transactionHash || '',
        type: tx.kind,
        fromWallet: tx.sourceAccount,
        fee: tx.feeCharged
          ? (Number(tx.feeCharged) / 10000000).toFixed(7)
          : undefined,
        ledger: tx.ledger ? Number(tx.ledger) : undefined,
        timestamp: tx.confirmedAt
          ? tx.confirmedAt.toISOString()
          : tx.createdAt.toISOString(),
        status: tx.status,
        explorerUrl: tx.transactionHash
          ? this.stellarService.getTransactionExplorerUrl(tx.transactionHash)
          : null,
      }));

    const seen = new Set<string>();
    return [...dbHistory, ...contractHistory, ...horizonHistory]
      .filter((item) => {
        const key = item.hash || item.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(
        (a, b) => Date.parse(b.timestamp || '') - Date.parse(a.timestamp || ''),
      );
  }
}
