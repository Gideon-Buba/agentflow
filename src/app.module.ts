import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HederaModule } from './hedera/hedera.module';
import { SupabaseModule } from './supabase/supabase.module';
import { TasksModule } from './tasks/tasks.module';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    HederaModule,
    TasksModule,
    AgentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
