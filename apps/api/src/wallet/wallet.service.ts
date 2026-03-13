import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class WalletService {
  constructor(@Inject(DRIZZLE) private db: Db) {}

  async getBalance(userId: number): Promise<number> {
    const result = await this.db
      .select({ balance: sql<string>`COALESCE(SUM(${schema.walletTransactions.amount}), 0)` })
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.userId, userId),
          eq(schema.walletTransactions.status, 'SUCCESS'),
        ),
      );
    return parseFloat(result[0]?.balance ?? '0');
  }

  async getInsuranceBalance(userId: number): Promise<number> {
    const result = await this.db
      .select({ balance: sql<string>`COALESCE(SUM(${schema.walletTransactions.amount}), 0)` })
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.userId, userId),
          eq(schema.walletTransactions.status, 'SUCCESS'),
          sql`${schema.walletTransactions.type} IN ('INSURANCE_LOCK', 'INSURANCE_UNLOCK')`,
        ),
      );
    return parseFloat(result[0]?.balance ?? '0');
  }

  /**
   * Credit (add funds) - amount should be POSITIVE
   * Must be called inside a transaction for atomicity
   */
  async credit(
    db: Db,
    params: {
      userId: number;
      amount: number;
      type: string;
      referenceId?: number;
      referenceType?: string;
      note?: string;
    },
  ) {
    const [tx] = await db.insert(schema.walletTransactions).values({
      userId: params.userId,
      amount: params.amount.toString(),
      type: params.type,
      status: 'SUCCESS',
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      note: params.note,
    }).returning();
    return tx;
  }

  /**
   * Debit (subtract funds) - amount should be POSITIVE (will be stored as negative)
   * Checks sufficient balance first
   */
  async debit(
    db: Db,
    params: {
      userId: number;
      amount: number;
      type: string;
      referenceId?: number;
      referenceType?: string;
      note?: string;
    },
  ) {
    // Check balance with pessimistic lock (best effort - using SUM check)
    const balance = await this.getBalance(params.userId);
    if (balance < params.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const [tx] = await db.insert(schema.walletTransactions).values({
      userId: params.userId,
      amount: (-params.amount).toString(),
      type: params.type,
      status: 'SUCCESS',
      referenceId: params.referenceId,
      referenceType: params.referenceType,
      note: params.note,
    }).returning();
    return tx;
  }
}
