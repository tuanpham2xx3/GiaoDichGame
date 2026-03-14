import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@giaodich/shared';
import { PinController } from './pin.controller';
import { PinService } from './pin.service';
import { DatabaseModule } from '../database/database.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [
    DatabaseModule,
    WalletModule,
    NotificationsModule,
    ListingsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.PREMIUM }),
  ],
  controllers: [PinController],
  providers: [PinService],
  exports: [PinService],
})
export class PinModule {}
