import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';
import { WalletService } from './wallet.service';
import { WithdrawDto } from './dto/wallet.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class WithdrawService {
  constructor(
    @Inject(DRIZZLE) private db: Db,
    private walletService: WalletService,
  ) {}

  async createWithdrawRequest(userId: number, dto: WithdrawDto) {
    const balance = await this.walletService.getBalance(userId);
    if (balance < dto.amountCoin) {
      throw new BadRequestException(`Insufficient balance. Available: ${balance}`);
    }

    // Debit the coins
    const tx = await this.walletService.debit(this.db, {
      userId,
      amount: dto.amountCoin,
      type: 'WITHDRAW',
      note: `Rút Coin về ${dto.bankName} - ${dto.bankAccount}`,
    });

    // Create withdraw request record
    const results = await this.db
      .insert(schema.withdrawRequests)
      .values({
        userId,
        amountCoin: dto.amountCoin.toString(),
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        bankHolder: dto.bankHolder,
        status: 'PROCESSING',
      })
      .returning();
    
    if (!results[0]) throw new Error('Failed to create withdraw request');
    const request = results[0];

    // Mock bank API call → always success in Sprint 1
    const mockBankSuccess = true;
    if (mockBankSuccess) {
      await this.db
        .update(schema.withdrawRequests)
        .set({ status: 'SUCCESS', gatewayRef: `MOCK-${Date.now()}` })
        .where(eq(schema.withdrawRequests.id, request.id));
    } else {
      // Refund on failure
      await this.walletService.credit(this.db, {
        userId,
        amount: dto.amountCoin,
        type: 'RELEASE',
        referenceId: request.id,
        referenceType: 'WITHDRAW',
        note: 'Hoàn Coin do rút thất bại',
      });
      await this.db
        .update(schema.withdrawRequests)
        .set({ status: 'FAILED' })
        .where(eq(schema.withdrawRequests.id, request.id));
    }

    return {
      id: request.id,
      amountCoin: dto.amountCoin,
      status: mockBankSuccess ? 'SUCCESS' : 'FAILED',
    };
  }
}
