import { Body, Controller, Param, Post } from '@nestjs/common';
import { EscrowsService } from './escrows.service';

@Controller()
export class PublicEscrowsController {
  constructor(private escrowsService: EscrowsService) {}

  @Post('public/invoices/:publicToken/escrow-intents')
  async createIntent(
    @Param('publicToken') publicToken: string,
    @Body() body: { payerWallet: string },
  ) {
    return this.escrowsService.createIntent(publicToken, body.payerWallet);
  }

  @Post('public/escrow-intents/:escrowId/submit-create')
  async submitCreate(
    @Param('escrowId') escrowId: string,
    @Body() body: { signedXdr: string; payerWallet: string },
  ) {
    return this.escrowsService.submitCreate(
      escrowId,
      body.signedXdr,
      body.payerWallet,
    );
  }

  @Post('public/escrow-intents/:escrowId/prepare-deposit')
  async prepareDeposit(
    @Param('escrowId') escrowId: string,
    @Body() body: { payerWallet: string },
  ) {
    return this.escrowsService.prepareDeposit(escrowId, body.payerWallet);
  }

  @Post('public/escrow-intents/:escrowId/submit-deposit')
  async submitDeposit(
    @Param('escrowId') escrowId: string,
    @Body()
    body: { signedXdr: string; payerWallet: string; paymentIntentId?: string },
  ) {
    return this.escrowsService.submitDeposit(
      escrowId,
      body.signedXdr,
      body.payerWallet,
      body.paymentIntentId,
    );
  }
}
