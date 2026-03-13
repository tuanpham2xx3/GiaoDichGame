import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    // Load .env file; available globally across all modules
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database module (Drizzle + PostgreSQL)
    DatabaseModule,

    // BullMQ + Redis queue module
    QueueModule,

    // Health check endpoint
    TerminusModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
