import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PublicInvoicesController } from './public-invoices.controller';

@Module({
  imports: [],
  providers: [InvoicesService],
  controllers: [InvoicesController, PublicInvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
