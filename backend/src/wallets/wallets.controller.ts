import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @Get(':address/balance')
  async balance(@Param('address') address: string) {
    return this.walletsService.getBalance(address);
  }

  @Get(':address/transactions')
  @UseGuards(JwtAuthGuard)
  async transactions(@Param('address') address: string) {
    return this.walletsService.getTransactions(address);
  }
}
