import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [WalletModule, NotificationsModule],
  providers: [OrdersService, EncryptionService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
