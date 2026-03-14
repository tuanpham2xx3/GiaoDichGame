import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '@giaodich/shared';
import { OrdersProcessor } from './processors/orders.processor';
import { DisputesProcessor } from './processors/disputes.processor';
import { PremiumProcessor } from './processors/premium.processor';
import { OrdersModule } from '../orders/orders.module';
import { DisputesModule } from '../disputes/disputes.module';
import { VipModule } from '../vip/vip.module';
import { PinModule } from '../pin/pin.module';

@Global()
@Module({
  imports: [
    // Redis connection (shared across all queues)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
        },
      }),
    }),

    // Register queues (workers will be added Sprint 3+)
    BullModule.registerQueue(
      { name: QUEUE_NAMES.ORDERS },
      { name: QUEUE_NAMES.DISPUTES },
      { name: QUEUE_NAMES.PREMIUM },
    ),
    
    // Import OrdersModule to use OrdersService
    OrdersModule,
    DisputesModule,
    VipModule,
    PinModule,
  ],
  providers: [OrdersProcessor, DisputesProcessor, PremiumProcessor],
  exports: [BullModule],
})
export class QueueModule {}
