import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      email?: string;
      walletAddress?: string;
      notes?: string;
    },
  ) {
    return this.customersService.create(req.user.id, body);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.customersService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.customersService.findOne(req.user.id, id);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      walletAddress?: string;
      notes?: string;
    },
  ) {
    return this.customersService.update(req.user.id, id, body);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.customersService.remove(req.user.id, id);
    return { success: true };
  }
}
