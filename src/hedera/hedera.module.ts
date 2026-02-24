import { Module } from '@nestjs/common';
import { HederaService } from './hedera.service';
import { HederaController } from './hedera.controller';

@Module({
  controllers: [HederaController],
  providers: [HederaService],
  exports: [HederaService], // so other modules (agents, tasks) can inject it
})
export class HederaModule {}
