import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
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

  @Post('public/payment-intents/:paymentIntentId/submit')
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

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: any) {
    return this.paymentsService.findAll(req.user.id);
  }

  @Post('faucet')
  async requestFaucet(@Body() body: { address: string }) {
    return this.paymentsService.requestFaucet(body.address);
  }

  @Get('hash/:transactionHash')
  @UseGuards(JwtAuthGuard)
  async findByHash(@Param('transactionHash') transactionHash: string) {
    return this.paymentsService.findByHash(transactionHash);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get(':id/receipt')
  async receipt(@Param('id') id: string) {
    return this.paymentsService.getReceipt(id);
  }

  @Post(':id/refunds/prepare')
  @UseGuards(JwtAuthGuard)
  async prepareRefund(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { amount: string; reason: string },
  ) {
    return this.paymentsService.prepareRefund(req.user.id, id, body);
  }
}
