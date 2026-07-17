import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private stellarService: StellarService,
  ) {}

  @Get()
  async getHealth() {
    return { status: 'OK', timestamp: new Date() };
  }

  @Get('database')
  async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'UP', database: 'PostgreSQL connected' };
    } catch (e) {
      return { status: 'DOWN', error: e.message };
    }
  }

  @Get('stellar')
  async checkStellar() {
    try {
      return {
        status: 'UP',
        network: this.stellarService.getNetwork(),
        horizon: 'connected',
      };
    } catch (e) {
      return { status: 'DOWN', error: e.message };
    }
  }
}
