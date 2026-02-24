import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HederaModule } from './hedera/hedera.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HederaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
