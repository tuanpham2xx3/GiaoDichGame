import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';
import { WalletService } from './wallet.service';
import { InsuranceDepositDto, InsuranceWithdrawDto } from './dto/wallet.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class InsuranceService {
  constructor(
    @Inject(DRIZZLE) private db: Db,
    private walletService: WalletService,
  ) {}

  async deposit(userId: number, dto: InsuranceDepositDto) {
    // Debit from main balance
    const balance = await this.walletService.getBalance(userId);
    if (balance < dto.amountCoin) {
      throw new BadRequestException('Insufficient balance for insurance deposit');
    }

    await this.walletService.debit(this.db, {
      userId,
      amount: dto.amountCoin,
      type: 'WITHDRAW',
      note: 'Nạp quỹ bảo hiểm',
    });

    // Add to insurance ledger
    await this.walletService.credit(this.db, {
      userId,
      amount: dto.amountCoin,
      type: 'INSURANCE_LOCK',
      note: 'Nạp quỹ bảo hiểm Seller',
    });

    const newBalance = await this.walletService.getInsuranceBalance(userId);
    return { insuranceBalance: newBalance };
  }

  async withdraw(userId: number, dto: InsuranceWithdrawDto) {
    const insuranceBalance = await this.walletService.getInsuranceBalance(userId);
    if (insuranceBalance < dto.amountCoin) {
      throw new BadRequestException('Insufficient insurance balance');
    }

    // Check conditions:
    // 1. Last INSURANCE_LOCK was at least 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const lastLock = await this.db
      .select({ createdAt: schema.walletTransactions.createdAt })
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.userId, userId),
          eq(schema.walletTransactions.type, 'INSURANCE_LOCK'),
          eq(schema.walletTransactions.status, 'SUCCESS'),
        ),
      )
      .orderBy(sql`${schema.walletTransactions.createdAt} DESC`)
      .limit(1);

    const latestLock = lastLock[0];
    if (latestLock && latestLock.createdAt > thirtyDaysAgo) {
      throw new BadRequestException(
        'Cannot withdraw: must wait 30 days since last deposit',
      );
    }

    // 2. No active orders in last 14 days (simplified: just check HOLD type)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentHolds = await this.db
      .select({ id: schema.walletTransactions.id })
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.userId, userId),
          eq(schema.walletTransactions.type, 'HOLD'),
          eq(schema.walletTransactions.status, 'SUCCESS'),
          sql`${schema.walletTransactions.createdAt} > ${fourteenDaysAgo}`,
        ),
      )
      .limit(1);

    if (recentHolds.length > 0) {
      throw new BadRequestException(
        'Cannot withdraw: active orders within last 14 days',
      );
    }

    await this.walletService.credit(this.db, {
      userId,
      amount: dto.amountCoin,
      type: 'INSURANCE_UNLOCK',
      note: 'Rút quỹ bảo hiểm',
    });

    return { withdrawnAmount: dto.amountCoin };
  }
}
