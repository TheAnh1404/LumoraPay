import {
  Controller,
  Get,
  UseGuards,
  Req,
  Post,
  Patch,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MerchantsService } from './merchants.service';

@Controller('merchants')
@UseGuards(JwtAuthGuard)
export class MerchantsController {
  constructor(private merchantsService: MerchantsService) {}

  @Get('current')
  async getCurrentMerchant(@Req() req: any) {
    return this.merchantsService.getCurrentMerchant(req.user.id);
  }

  @Get('current/dashboard')
  async getDashboardStats(@Req() req: any) {
    return this.merchantsService.getDashboardStats(req.user.id);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      businessName: string;
      slug: string;
      supportEmail?: string;
      defaultWalletAddress: string;
    },
  ) {
    return this.merchantsService.create(req.user.id, body);
  }

  @Patch('current')
  async updateCurrent(
    @Req() req: any,
    @Body()
    body: {
      businessName?: string;
      slug?: string;
      supportEmail?: string;
      defaultWalletAddress?: string;
    },
  ) {
    return this.merchantsService.updateCurrent(req.user.id, body);
  }
}
