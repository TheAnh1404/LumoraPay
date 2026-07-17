import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StellarModule } from './stellar/stellar.module';
import { AuthModule } from './auth/auth.module';
import { MerchantsModule } from './merchants/merchants.module';
import { CustomersModule } from './customers/customers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { HealthModule } from './health/health.module';
import stellarConfig from './config/stellar.config';
import { validateEnv } from './config/env.validation';
import { WalletsModule } from './wallets/wallets.module';
import { ContractsModule } from './contracts/contracts.module';
import { EscrowsModule } from './escrows/escrows.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [stellarConfig],
      validate: validateEnv,
    }),
    PrismaModule,
    StellarModule,
    AuthModule,
    MerchantsModule,
    CustomersModule,
    InvoicesModule,
    PaymentsModule,
    HealthModule,
    WalletsModule,
    ContractsModule,
    EscrowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
