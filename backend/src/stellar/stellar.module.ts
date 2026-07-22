import { Global, Module } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { SorobanService } from './soroban.service';
import { StellarEventListenerService } from './stellar-event-listener.service';
import { StellarController } from './stellar.controller';

@Global()
@Module({
  providers: [StellarService, SorobanService, StellarEventListenerService],
  controllers: [StellarController],
  exports: [StellarService, SorobanService, StellarEventListenerService],
})
export class StellarModule {}
