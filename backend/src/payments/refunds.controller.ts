import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post(':id/submit')
  async submit(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { signedXdr: string },
  ) {
    return this.paymentsService.submitRefund(req.user.id, id, body.signedXdr);
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    return this.paymentsService.getRefund(req.user.id, id);
  }
}
