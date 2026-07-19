import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class ContractsService {
  constructor(
    private configService: ConfigService,
    private stellarService: StellarService,
  ) {}

  getConfig() {
    const invoiceRegistryContractId = this.getInvoiceRegistryContractId();
    const paymentEscrowContractId = this.getPaymentEscrowContractId();
    return {
      network: this.stellarService.getNetwork(),
      rpcUrl: this.configService.get<string>('stellar.rpcUrl') || '',
      invoiceRegistryContractId,
      paymentEscrowContractId,
      invoiceRegistryConfigured: Boolean(invoiceRegistryContractId),
      paymentEscrowConfigured: Boolean(paymentEscrowContractId),
      feeRecipient:
        this.configService.get<string>('stellar.feeRecipient') || '',
      feeBps: this.configService.get<number>('stellar.feeBps') || 0,
    };
  }

  getInvoiceRegistryContractId() {
    return (
      this.configService.get<string>('stellar.invoiceRegistryContractId') || ''
    );
  }

  getPaymentEscrowContractId() {
    return (
      this.configService.get<string>('stellar.paymentEscrowContractId') || ''
    );
  }

  getContractAdminPublicKey() {
    return process.env.CONTRACT_ADMIN_PUBLIC_KEY || '';
  }

  requireContract(contractId: string, name: string) {
    if (!contractId) {
      throw new ServiceUnavailableException(
        `${name} contract ID is not configured. Deploy the contract and set the matching environment variable.`,
      );
    }
  }

  assertInvoiceRegistryConfigured() {
    this.requireContract(
      this.configService.get<string>('stellar.invoiceRegistryContractId') || '',
      'Invoice Registry',
    );
  }

  assertPaymentEscrowConfigured() {
    this.requireContract(
      this.configService.get<string>('stellar.paymentEscrowContractId') || '',
      'Payment Escrow',
    );
  }
}
