import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller()
export class PublicPaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('public/invoices/:publicToken/payment-intents')
  async createIntent(
    @Param('publicToken') publicToken: string,
    @Body() body: { payerWallet: string },
  ) {
    return this.paymentsService.createPaymentIntent(
      publicToken,
      body.payerWallet,
    );
  }

  @Post('payment-intents/:paymentIntentId/submit')
  async submit(
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: { signedXdr: string; payerWallet: string },
  ) {
    return this.paymentsService.submitPaymentIntent(
      paymentIntentId,
      body.signedXdr,
      body.payerWallet,
    );
  }

  @Get('payment-intents/:paymentIntentId/status')
  async status(@Param('paymentIntentId') paymentIntentId: string) {
    return this.paymentsService.getPaymentIntentStatus(paymentIntentId);
  }
}
