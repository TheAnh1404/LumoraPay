import { Body, Controller, Post } from '@nestjs/common';
import { StellarService } from './stellar.service';

@Controller('stellar')
export class StellarController {
  constructor(private stellarService: StellarService) {}

  @Post('faucet')
  async requestFaucet(@Body() body: { address: string }) {
    const result = await this.stellarService.requestFaucet(body.address);
    if (!result.success) {
      return {
        success: false,
        address: body.address,
        balance: result.balance,
        transactionHash: result.transactionHash,
      };
    }
    return {
      success: true,
      address: body.address,
      balance: result.balance,
      transactionHash: result.transactionHash,
    };
  }
}
