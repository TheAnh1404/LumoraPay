import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PublicPaymentsController } from './public-payments.controller';
import { RefundsController } from './refunds.controller';

@Module({
  providers: [PaymentsService],
  controllers: [
    PaymentsController,
    PublicPaymentsController,
    RefundsController,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
