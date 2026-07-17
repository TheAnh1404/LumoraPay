import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EscrowsService } from './escrows.service';

@Controller('escrows')
export class EscrowsController {
  constructor(private escrowsService: EscrowsService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async get(@Req() req: any, @Param('id') id: string) {
    return this.escrowsService.get(req.user.id, id);
  }

  @Get(':id/on-chain-state')
  @UseGuards(JwtAuthGuard)
  async onChainState(@Req() req: any, @Param('id') id: string) {
    return this.escrowsService.onChainState(req.user.id, id);
  }

  @Post(':id/prepare-deposit')
  async prepareDeposit(
    @Param('id') id: string,
    @Body() body: { payerWallet: string },
  ) {
    return this.escrowsService.prepareDeposit(id, body.payerWallet);
  }

  @Post(':id/submit-deposit')
  async submitDeposit(
    @Param('id') id: string,
    @Body()
    body: { signedXdr: string; payerWallet: string; paymentIntentId?: string },
  ) {
    return this.escrowsService.submitDeposit(
      id,
      body.signedXdr,
      body.payerWallet,
      body.paymentIntentId,
    );
  }

  @Post(':id/prepare-release')
  async prepareRelease(
    @Param('id') id: string,
    @Body() body: { sourceWallet: string },
  ) {
    return this.escrowsService.prepareAction(id, 'release', body);
  }

  @Post(':id/submit-release')
  async submitRelease(
    @Param('id') id: string,
    @Body() body: { signedXdr: string; sourceWallet: string },
  ) {
    return this.escrowsService.submitAction(id, 'release', body);
  }

  @Post(':id/prepare-refund')
  async prepareRefund(
    @Param('id') id: string,
    @Body() body: { sourceWallet: string },
  ) {
    return this.escrowsService.prepareAction(id, 'refund', body);
  }

  @Post(':id/submit-refund')
  async submitRefund(
    @Param('id') id: string,
    @Body() body: { signedXdr: string; sourceWallet: string },
  ) {
    return this.escrowsService.submitAction(id, 'refund', body);
  }

  @Post(':id/prepare-dispute')
  async prepareDispute(
    @Param('id') id: string,
    @Body()
    body: { sourceWallet: string; evidenceHash?: string; reason?: string; description?: string },
  ) {
    return this.escrowsService.prepareAction(id, 'open_dispute', body);
  }

  @Post(':id/submit-dispute')
  async submitDispute(
    @Param('id') id: string,
    @Body() body: { signedXdr: string; sourceWallet: string },
  ) {
    return this.escrowsService.submitAction(id, 'open_dispute', body);
  }

  @Post(':id/prepare-resolve-dispute')
  @UseGuards(JwtAuthGuard)
  async prepareResolveDispute(
    @Param('id') id: string,
    @Body()
    body: { sourceWallet: string; merchantAmount: string; payerAmount: string },
  ) {
    return this.escrowsService.prepareAction(id, 'resolve_dispute', body);
  }

  @Post(':id/submit-resolve-dispute')
  @UseGuards(JwtAuthGuard)
  async submitResolveDispute(
    @Param('id') id: string,
    @Body()
    body: {
      signedXdr: string;
      sourceWallet: string;
      merchantAmount: string;
      payerAmount: string;
    },
  ) {
    return this.escrowsService.submitAction(id, 'resolve_dispute', body);
  }
}
