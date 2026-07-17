import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts/contracts.module';
import { EscrowsController } from './escrows.controller';
import { PublicEscrowsController } from './public-escrows.controller';
import { EscrowsService } from './escrows.service';

@Module({
  imports: [ContractsModule],
  controllers: [EscrowsController, PublicEscrowsController],
  providers: [EscrowsService],
})
export class EscrowsModule {}
