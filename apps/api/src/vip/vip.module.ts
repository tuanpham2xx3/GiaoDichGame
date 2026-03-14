import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@giaodich/shared';
import { VipController } from './vip.controller';
import { VipService } from './vip.service';
import { DatabaseModule } from '../database/database.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    DatabaseModule,
    WalletModule,
    NotificationsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.PREMIUM }),
  ],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
