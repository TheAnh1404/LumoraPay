import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() req: any,
    @Body()
    body: {
      title: string;
      description?: string;
      customerId?: string;
      customer?: { name: string; email?: string; walletAddress?: string };
      amount?: string;
      dueDate?: string;
      memo?: string;
      paymentType?: 'DIRECT' | 'ESCROW' | 'MILESTONE';
      destinationWallet?: string;
      open?: boolean;
      items: {
        name?: string;
        description?: string;
        quantity: number;
        unitPrice: string;
      }[];
    },
  ) {
    return this.invoicesService.create(req.user.id, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: any) {
    return this.invoicesService.findAll(req.user.id);
  }

  @Get('public/:publicToken')
  async findByPublicToken(@Param('publicToken') publicToken: string) {
    return this.invoicesService.findByPublicToken(publicToken);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.invoicesService.findOne(req.user.id, id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.invoicesService.cancel(req.user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.invoicesService.update(req.user.id, id, body);
  }

  @Post(':id/open')
  @UseGuards(JwtAuthGuard)
  async open(@Req() req: any, @Param('id') id: string) {
    return this.invoicesService.open(req.user.id, id);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  async duplicate(@Req() req: any, @Param('id') id: string) {
    return this.invoicesService.duplicate(req.user.id, id);
  }

  @Post(':id/prepare-onchain')
  @UseGuards(JwtAuthGuard)
  async prepareOnChain(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { sourceWallet?: string },
  ) {
    return this.invoicesService.prepareOnChainRegistry(
      req.user.id,
      id,
      body?.sourceWallet,
    );
  }

  @Post(':id/submit-onchain')
  @UseGuards(JwtAuthGuard)
  async submitOnChain(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { signedXdr: string; sourceWallet: string },
  ) {
    return this.invoicesService.submitOnChainRegistry(
      req.user.id,
      id,
      body.signedXdr,
      body.sourceWallet,
    );
  }

  @Get(':id/onchain-state')
  @UseGuards(JwtAuthGuard)
  async getOnChainState(@Req() req: any, @Param('id') id: string) {
    return this.invoicesService.onChainRegistryState(req.user.id, id);
  }
}
