import { Global, Module } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { SorobanService } from './soroban.service';
import { StellarController } from './stellar.controller';

@Global()
@Module({
  providers: [StellarService, SorobanService],
  controllers: [StellarController],
  exports: [StellarService, SorobanService],
})
export class StellarModule {}
