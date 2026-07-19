import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StellarService } from '../stellar/stellar.service';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private stellarService: StellarService,
    private configService: ConfigService,
  ) {}

  @Get()
  async getHealth() {
    return {
      status: 'OK',
      service: 'lumorapay-backend',
      version:
        process.env.APP_VERSION || process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database')
  async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'UP', database: 'PostgreSQL connected' };
    } catch (e) {
      return { status: 'DOWN', error: errorMessage(e) };
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
      return { status: 'DOWN', error: errorMessage(e) };
    }
  }

  @Get('readiness')
  async readiness(@Res({ passthrough: true }) response: Response) {
    const checks = {
      database: await this.databaseReady(),
      stellar: this.stellarReady(),
      contracts: this.contractsReady(),
    };
    const ready = Object.values(checks).every((check) => check.status === 'UP');

    if (!ready) {
      response.status(503);
    }

    return {
      status: ready ? 'UP' : 'DOWN',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  private async databaseReady() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'UP' as const };
    } catch (error) {
      return { status: 'DOWN' as const, error: errorMessage(error) };
    }
  }

  private stellarReady() {
    return {
      status: 'UP' as const,
      network: this.stellarService.getNetwork(),
      horizonUrl: this.configService.get<string>('stellar.horizonUrl'),
      rpcUrl: this.configService.get<string>('stellar.rpcUrl'),
    };
  }

  private contractsReady() {
    const invoiceRegistryContractId =
      this.configService.get<string>('stellar.invoiceRegistryContractId') || '';
    const paymentEscrowContractId =
      this.configService.get<string>('stellar.paymentEscrowContractId') || '';
    const ready = Boolean(invoiceRegistryContractId && paymentEscrowContractId);

    return {
      status: ready ? ('UP' as const) : ('DOWN' as const),
      invoiceRegistryConfigured: Boolean(invoiceRegistryContractId),
      paymentEscrowConfigured: Boolean(paymentEscrowContractId),
    };
  }
}
