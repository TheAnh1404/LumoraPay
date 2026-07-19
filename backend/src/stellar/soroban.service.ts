import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarService } from './stellar.service';

interface BuildInvocationInput {
  source: string;
  contractId: string;
  functionName: string;
  args: StellarSdk.xdr.ScVal[];
  timeoutSeconds?: number;
}

interface ExpectedContractCall {
  source?: string;
  contractId: string;
  functionName: string;
  firstArgHex?: string;
  argCount?: number;
}

export interface ParsedContractCall {
  source: string;
  contractId: string;
  functionName: string;
  args: StellarSdk.xdr.ScVal[];
  transaction: StellarSdk.Transaction;
}

export interface SorobanSubmissionResult {
  hash: string;
  ledger: number;
  fee: string;
  createdAt: Date;
  resultXdr: string;
  events: unknown[];
}

@Injectable()
export class SorobanService {
  private readonly logger = new Logger(SorobanService.name);
  private readonly server: StellarSdk.rpc.Server;
  private readonly networkPassphrase: string;
  private readonly network: 'TESTNET' | 'MAINNET';

  constructor(
    private configService: ConfigService,
    private stellarService: StellarService,
  ) {
    const rpcUrl =
      this.configService.get<string>('stellar.rpcUrl') ||
      'https://soroban-testnet.stellar.org';
    this.server = new StellarSdk.rpc.Server(rpcUrl, {
      allowHttp: rpcUrl.startsWith('http://'),
      timeout: 30000,
    });
    this.networkPassphrase = this.stellarService.getNetworkPassphrase();
    this.network = this.stellarService.getNetwork();
  }

  getNetworkPassphrase() {
    return this.networkPassphrase;
  }

  getNativeAssetContractId() {
    return StellarSdk.Asset.native().contractId(this.networkPassphrase);
  }

  validateContractId(contractId: string) {
    if (!StellarSdk.StrKey.isValidContract(contractId)) {
      throw new BadRequestException('Invalid Stellar contract ID');
    }
  }

  address(address: string) {
    if (
      !StellarSdk.StrKey.isValidEd25519PublicKey(address) &&
      !StellarSdk.StrKey.isValidContract(address)
    ) {
      throw new BadRequestException('Invalid Stellar address');
    }
    return new StellarSdk.Address(address).toScVal();
  }

  bytesN32(value: string) {
    return StellarSdk.xdr.ScVal.scvBytes(
      Buffer.from(this.bytesN32Hex(value), 'hex'),
    );
  }

  bytesN32Hex(value: string) {
    const normalized = value.trim().replace(/^0x/i, '');
    if (/^[0-9a-f]{64}$/i.test(normalized)) {
      return normalized.toLowerCase();
    }
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  hashJson(value: unknown) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex');
  }

  amountToStroops(amount: string | number) {
    const raw = String(amount).trim();
    if (!/^\d+(\.\d{1,7})?$/.test(raw)) {
      throw new BadRequestException('Invalid Stellar amount');
    }

    const [whole, fraction = ''] = raw.split('.');
    const stroops =
      BigInt(whole) * 10_000_000n +
      BigInt(fraction.padEnd(7, '0').slice(0, 7) || '0');
    if (stroops <= 0n) {
      throw new BadRequestException('Invalid Stellar amount');
    }
    return stroops;
  }

  stroopsToAmount(stroops: bigint | string | number) {
    const value = BigInt(stroops);
    const whole = value / 10_000_000n;
    const fraction = (value % 10_000_000n).toString().padStart(7, '0');
    return `${whole}.${fraction}`;
  }

  u64(value: Date | number | bigint) {
    const seconds =
      value instanceof Date
        ? Math.floor(value.getTime() / 1000)
        : typeof value === 'bigint'
          ? value
          : Math.floor(value);
    return StellarSdk.nativeToScVal(seconds, { type: 'u64' });
  }

  i128(value: bigint | string | number) {
    return StellarSdk.nativeToScVal(BigInt(value), { type: 'i128' });
  }

  async buildInvocation(input: BuildInvocationInput) {
    this.stellarService.validatePublicKey(input.source);
    this.validateContractId(input.contractId);

    let account: StellarSdk.Account;
    try {
      account = await this.server.getAccount(input.source);
    } catch (e: any) {
      if (e?.response?.status === 404 || e?.message?.includes('not found')) {
        throw new BadRequestException(
          'Source Stellar account is not funded on the configured network',
        );
      }
      this.logger.error('Failed to load source account from Soroban RPC:', e);
      throw new ServiceUnavailableException(
        'Unable to load source account from Soroban RPC',
      );
    }

    const contract = new StellarSdk.Contract(input.contractId);
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(input.functionName, ...input.args))
      .setTimeout(input.timeoutSeconds || 300)
      .build();

    let prepared: StellarSdk.Transaction;
    try {
      prepared = await this.server.prepareTransaction(transaction);
    } catch (e: any) {
      const message =
        e?.message || 'Soroban simulation failed while preparing transaction';
      this.logger.error(`Soroban prepare failed: ${message}`);
      throw new BadRequestException(message);
    }

    return {
      unsignedXdr: prepared.toXDR(),
      network: this.network,
      networkPassphrase: this.networkPassphrase,
      fee: prepared.fee,
      expiresAt: new Date(
        Date.now() + (input.timeoutSeconds || 300) * 1000,
      ).toISOString(),
    };
  }

  async simulateInvocation(input: BuildInvocationInput): Promise<unknown> {
    this.stellarService.validatePublicKey(input.source);
    this.validateContractId(input.contractId);
    const account = await this.server.getAccount(input.source);
    const contract = new StellarSdk.Contract(input.contractId);
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(input.functionName, ...input.args))
      .setTimeout(input.timeoutSeconds || 300)
      .build();

    const simulation = await this.server.simulateTransaction(transaction);
    if ('error' in simulation && simulation.error) {
      throw new BadRequestException(simulation.error);
    }
    if (!('result' in simulation) || !simulation.result?.retval) {
      return null;
    }
    return this.toJsonSafe(StellarSdk.scValToNative(simulation.result.retval));
  }

  parseContractCall(signedXdr: string): ParsedContractCall {
    let parsed: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction;
    try {
      parsed = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        this.networkPassphrase,
      );
    } catch {
      throw new BadRequestException('Malformed transaction XDR');
    }

    if (!('operations' in parsed) || parsed.operations.length !== 1) {
      throw new BadRequestException(
        'Transaction must contain exactly one contract invocation',
      );
    }

    const transaction = parsed as StellarSdk.Transaction;
    const operation = transaction.operations[0] as any;
    if (operation.type !== 'invokeHostFunction') {
      throw new BadRequestException(
        'Transaction operation must be a Soroban contract invocation',
      );
    }

    const hostFunction = operation.func;
    if (
      !hostFunction ||
      hostFunction.switch().name !== 'hostFunctionTypeInvokeContract'
    ) {
      throw new BadRequestException(
        'Transaction must invoke a contract function',
      );
    }

    const invocation = hostFunction.invokeContract();
    return {
      source: transaction.source,
      contractId: StellarSdk.Address.fromScAddress(
        invocation.contractAddress(),
      ).toString(),
      functionName: invocation.functionName().toString(),
      args: invocation.args(),
      transaction,
    };
  }

  verifyContractCall(signedXdr: string, expected: ExpectedContractCall) {
    const call = this.parseContractCall(signedXdr);

    if (expected.source && call.source !== expected.source) {
      throw new BadRequestException(
        'Signed transaction source account mismatch',
      );
    }
    if (call.contractId !== expected.contractId) {
      throw new BadRequestException('Signed transaction contract mismatch');
    }
    if (call.functionName !== expected.functionName) {
      throw new BadRequestException('Signed transaction function mismatch');
    }
    if (
      expected.argCount !== undefined &&
      call.args.length !== expected.argCount
    ) {
      throw new BadRequestException('Signed transaction argument mismatch');
    }
    if (expected.firstArgHex) {
      const firstArg = call.args[0];
      const firstArgHex =
        firstArg?.switch().name === 'scvBytes'
          ? Buffer.from(firstArg.bytes()).toString('hex')
          : '';
      if (firstArgHex !== expected.firstArgHex) {
        throw new BadRequestException('Signed transaction target ID mismatch');
      }
    }

    return call;
  }

  async submitAndPoll(signedXdr: string): Promise<SorobanSubmissionResult> {
    const call = this.parseContractCall(signedXdr);

    let submitted: StellarSdk.rpc.Api.SendTransactionResponse;
    try {
      submitted = await this.server.sendTransaction(call.transaction);
    } catch (e: any) {
      const message = e?.message || 'Failed to submit Soroban transaction';
      this.logger.error(`Soroban submit failed: ${message}`);
      throw new BadRequestException(message);
    }

    if (submitted.status === 'ERROR') {
      throw new BadRequestException(
        submitted.errorResult?.toXDR('base64') ||
          'Soroban RPC rejected the transaction',
      );
    }
    if (submitted.status === 'TRY_AGAIN_LATER') {
      throw new ServiceUnavailableException(
        'Soroban RPC is busy. Try again in a few seconds.',
      );
    }

    const result = await this.server.pollTransaction(submitted.hash, {
      attempts: 30,
      sleepStrategy: (attempt) => Math.min(1000 + attempt * 250, 3000),
    });

    if (result.status === 'NOT_FOUND') {
      throw new ServiceUnavailableException(
        'Soroban transaction was submitted but not confirmed before timeout',
      );
    }
    if (result.status === 'FAILED') {
      throw new BadRequestException(
        result.resultXdr.toXDR('base64') || 'Soroban transaction failed',
      );
    }

    const createdAt =
      result.createdAt > 1_000_000_000_000
        ? new Date(result.createdAt)
        : new Date(result.createdAt * 1000);
    const contractEvents = result.events?.contractEventsXdr?.flat() || [];

    return {
      hash: submitted.hash,
      ledger: result.ledger,
      fee: call.transaction.fee || StellarSdk.BASE_FEE,
      createdAt,
      resultXdr: result.resultXdr.toXDR('base64'),
      events: StellarSdk.humanizeEvents(contractEvents),
    };
  }

  toJsonSafe(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      return Buffer.from(value).toString('hex');
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.toJsonSafe(item));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          this.toJsonSafe(entry),
        ]),
      );
    }
    return value;
  }
}
