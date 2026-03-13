import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TopupService } from './topup.service';
import { WithdrawService } from './withdraw.service';
import { InsuranceService } from './insurance.service';
import { WalletController } from './wallet.controller';
import { AdminWalletController } from './admin-wallet.controller';

@Module({
  providers: [WalletService, TopupService, WithdrawService, InsuranceService],
  controllers: [WalletController, AdminWalletController],
  exports: [WalletService],
})
export class WalletModule {}
