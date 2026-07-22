import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import axios from 'axios';
import {
  getAccountExplorerUrl,
  getContractExplorerUrl,
  getLedgerExplorerUrl,
  getTransactionExplorerUrl,
  type StellarNetwork,
} from '../common/explorer';

export interface VerifiedPaymentXdr {
  sourceAccount: string;
  destination: string;
  amount: string;
  assetCode: string;
  assetIssuer?: string;
  memo: string | null;
}

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;
  private network: StellarNetwork;
  private expertBaseUrl: string;

  constructor(private configService: ConfigService) {
    const horizonUrl = this.configService.get<string>('stellar.horizonUrl')!;
    this.networkPassphrase = this.configService.get<string>(
      'stellar.networkPassphrase',
    )!;
    this.network = (this.configService.get<string>('stellar.network') ||
      'TESTNET') as StellarNetwork;
    this.expertBaseUrl = this.configService.get<string>(
      'stellar.expertBaseUrl',
    )!;
    this.server = new StellarSdk.Horizon.Server(horizonUrl);
  }

  getNetwork() {
    return this.network;
  }

  getNetworkPassphrase() {
    return this.networkPassphrase;
  }

  validatePublicKey(publicKey: string) {
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
      throw new BadRequestException('Invalid Stellar public key');
    }
  }

  async loadAccount(
    publicKey: string,
  ): Promise<StellarSdk.Horizon.AccountResponse> {
    this.validatePublicKey(publicKey);
    return this.server.loadAccount(publicKey);
  }

  async getBalance(publicKey: string): Promise<string> {
    try {
      const account = await this.loadAccount(publicKey);
      const nativeBalance = account.balances.find(
        (b) => b.asset_type === 'native',
      );
      return nativeBalance ? nativeBalance.balance : '0.0000000';
    } catch {
      return '0.0000000';
    }
  }

  async getBalances(publicKey: string) {
    const account = await this.loadAccount(publicKey);
    return account.balances.map((balance: any) => ({
      asset: balance.asset_type === 'native' ? 'XLM' : balance.asset_code,
      balance: balance.balance,
      issuer: balance.asset_issuer,
    }));
  }

  normalizeAmount(amount: string) {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('Invalid Stellar payment amount');
    }
    return parsed.toFixed(7);
  }

  async buildPaymentTx(
    from: string,
    to: string,
    amount: string,
    memo: string,
    assetCode = 'XLM',
    assetIssuer?: string,
  ): Promise<{
    unsignedXdr: string;
    networkPassphrase: string;
    expiresAt: Date;
  }> {
    this.validatePublicKey(from);
    this.validatePublicKey(to);
    let account: StellarSdk.Horizon.AccountResponse;
    try {
      account = await this.loadAccount(from);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        throw new BadRequestException(
          'Source Stellar account is not funded on Testnet',
        );
      }
      this.logger.error('Failed to load source account from Horizon:', e);
      throw new ServiceUnavailableException(
        'Unable to load source account from Horizon',
      );
    }

    let asset: StellarSdk.Asset;
    if (assetCode === 'XLM' || !assetCode) {
      asset = StellarSdk.Asset.native();
    } else {
      if (!assetIssuer) {
        throw new BadRequestException(
          `Asset issuer is required for custom asset ${assetCode}`,
        );
      }
      asset = new StellarSdk.Asset(assetCode, assetIssuer);
    }

    const normalizedAmount = this.normalizeAmount(amount);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
      timebounds: {
        minTime: 0,
        maxTime: Math.floor(expiresAt.getTime() / 1000),
      },
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: to,
          asset,
          amount: normalizedAmount,
        }),
      )
      .addMemo(StellarSdk.Memo.text(memo))
      .build();

    return {
      unsignedXdr: transaction.toXDR(),
      networkPassphrase: this.networkPassphrase,
      expiresAt,
    };
  }

  inspectPaymentXdr(xdr: string): VerifiedPaymentXdr {
    let tx: StellarSdk.Transaction;
    try {
      tx = StellarSdk.TransactionBuilder.fromXDR(
        xdr,
        this.networkPassphrase,
      ) as StellarSdk.Transaction;
    } catch {
      throw new BadRequestException('Malformed transaction XDR');
    }

    if (!('operations' in tx) || tx.operations.length !== 1) {
      throw new BadRequestException(
        'Transaction must contain exactly one payment operation',
      );
    }

    const operation = tx.operations[0] as any;
    if (operation.type !== 'payment') {
      throw new BadRequestException('Transaction operation must be a payment');
    }

    const opAsset = operation.asset as StellarSdk.Asset;
    const isNative = opAsset?.isNative?.();
    const assetCode = isNative ? 'XLM' : opAsset?.code;
    const assetIssuer = isNative ? undefined : opAsset?.issuer;

    const memo =
      tx.memo?.type === 'text' ? String((tx.memo as any).value) : null;
    return {
      sourceAccount: tx.source,
      destination: operation.destination,
      amount: this.normalizeAmount(operation.amount),
      assetCode: assetCode || 'XLM',
      assetIssuer,
      memo,
    };
  }

  verifyPaymentXdr(
    signedXdr: string,
    expectedFrom: string,
    expectedTo: string,
    expectedAmount: string,
    expectedMemo: string,
    expectedAssetCode = 'XLM',
    expectedAssetIssuer?: string,
  ) {
    const inspected = this.inspectPaymentXdr(signedXdr);
    if (inspected.sourceAccount !== expectedFrom) {
      throw new BadRequestException(
        'Signed transaction source account mismatch',
      );
    }
    if (inspected.destination !== expectedTo) {
      throw new BadRequestException('Signed transaction destination mismatch');
    }
    if (inspected.amount !== this.normalizeAmount(expectedAmount)) {
      throw new BadRequestException('Signed transaction amount mismatch');
    }
    if (inspected.memo !== expectedMemo) {
      throw new BadRequestException('Signed transaction memo mismatch');
    }
    if (inspected.assetCode !== expectedAssetCode) {
      throw new BadRequestException('Signed transaction asset code mismatch');
    }
    if (expectedAssetIssuer && inspected.assetIssuer !== expectedAssetIssuer) {
      throw new BadRequestException('Signed transaction asset issuer mismatch');
    }
    return inspected;
  }

  async submitTransaction(signedXdr: string): Promise<{
    hash: string;
    ledger: number;
    fee: string;
    createdAt?: string;
  }> {
    const tx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      this.networkPassphrase,
    ) as StellarSdk.Transaction;
    const response = await this.server.submitTransaction(tx);
    return {
      hash: response.hash,
      ledger: response.ledger,
      fee: ((response as any).fee_charged || StellarSdk.BASE_FEE).toString(),
      createdAt: (response as any).created_at,
    };
  }

  async verifyTransaction(
    txHash: string,
    expectedFrom: string,
    expectedTo: string,
    expectedAmount: string,
    expectedMemo: string,
    expectedAssetCode = 'XLM',
    expectedAssetIssuer?: string,
  ): Promise<boolean> {
    try {
      const tx = await this.server.transactions().transaction(txHash).call();
      if (!tx.successful) {
        return false;
      }

      if (tx.memo !== expectedMemo) {
        return false;
      }

      const ops = await this.server.operations().forTransaction(txHash).call();
      const paymentOp = ops.records.find((op) => {
        if (op.type !== 'payment') return false;
        const record = op as any;
        if (expectedAssetCode === 'XLM') {
          return record.asset_type === 'native';
        }
        return (
          record.asset_code === expectedAssetCode &&
          (!expectedAssetIssuer || record.asset_issuer === expectedAssetIssuer)
        );
      }) as any;

      if (!paymentOp) {
        return false;
      }

      return (
        paymentOp.source_account === expectedFrom &&
        paymentOp.to === expectedTo &&
        Number.parseFloat(paymentOp.amount).toFixed(7) ===
          this.normalizeAmount(expectedAmount)
      );
    } catch (e) {
      this.logger.error('Failed to verify transaction on Horizon:', e);
      return false;
    }
  }

  async getTransactionDetails(txHash: string) {
    const tx = await this.server.transactions().transaction(txHash).call();
    const ops = await this.server.operations().forTransaction(txHash).call();
    return { tx, operations: ops.records };
  }

  async getRecentAccountPayments(address: string, limit = 20) {
    this.validatePublicKey(address);
    const response = await this.server
      .payments()
      .forAccount(address)
      .order('desc')
      .limit(limit)
      .call();
    return response.records;
  }

  async requestFaucet(address: string): Promise<{
    success: boolean;
    transactionHash?: string | null;
    balance: string;
  }> {
    this.validatePublicKey(address);
    try {
      const response = await axios.get(
        `https://friendbot.stellar.org?addr=${address}`,
      );
      const transactionHash =
        typeof response.data?.hash === 'string' ? response.data.hash : null;
      const balance = await this.getBalance(address);
      return { success: response.status === 200, transactionHash, balance };
    } catch (e) {
      this.logger.error('Friendbot request failed:', e);
      return {
        success: false,
        transactionHash: null,
        balance: await this.getBalance(address),
      };
    }
  }

  getTransactionExplorerUrl(txHash: string) {
    return getTransactionExplorerUrl(this.network, txHash, this.expertBaseUrl);
  }

  getAccountExplorerUrl(publicKey: string) {
    return getAccountExplorerUrl(this.network, publicKey, this.expertBaseUrl);
  }

  getContractExplorerUrl(contractId: string) {
    return getContractExplorerUrl(this.network, contractId, this.expertBaseUrl);
  }

  getLedgerExplorerUrl(ledger: number | bigint) {
    return getLedgerExplorerUrl(this.network, ledger, this.expertBaseUrl);
  }

  getExplorerUrl(txHash: string): string {
    return this.getTransactionExplorerUrl(txHash) || '';
  }
}
