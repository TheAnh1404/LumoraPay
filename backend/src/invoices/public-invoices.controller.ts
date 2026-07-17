import { Controller, Get, Param } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('public/invoices')
export class PublicInvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get(':publicToken')
  async findByPublicToken(@Param('publicToken') publicToken: string) {
    return this.invoicesService.findByPublicToken(publicToken);
  }
}
