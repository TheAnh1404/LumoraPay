import { Controller, Get } from '@nestjs/common';
import { ContractsService } from './contracts.service';

@Controller('contracts')
export class ContractsController {
  constructor(private contractsService: ContractsService) {}

  @Get('config')
  async config() {
    return this.contractsService.getConfig();
  }

  @Get('invoice-registry/health')
  async invoiceRegistryHealth() {
    this.contractsService.assertInvoiceRegistryConfigured();
    return { status: 'CONFIGURED' };
  }

  @Get('payment-escrow/health')
  async paymentEscrowHealth() {
    this.contractsService.assertPaymentEscrowConfigured();
    return { status: 'CONFIGURED' };
  }
}
