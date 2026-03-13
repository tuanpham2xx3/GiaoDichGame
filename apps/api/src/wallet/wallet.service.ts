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
   * Get total HOLD amount for a user (excluding RELEASE transactions)
   */
  async getHoldBalance(userId: number): Promise<number> {
    const result = await this.db
      .select({ balance: sql<string>`COALESCE(SUM(${schema.walletTransactions.amount}), 0)` })
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.userId, userId),
          eq(schema.walletTransactions.status, 'SUCCESS'),
          eq(schema.walletTransactions.type, 'HOLD'),
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

  /**
   * Hold coins from buyer - creates HOLD transaction
   * Called when order is created
   */
  async holdCoins(
    db: Db,
    params: {
      userId: number;
      amount: number;
      orderId: number;
    },
  ) {
    // Check available balance (excluding existing HOLD)
    const balance = await this.getBalance(params.userId);
    const holdBalance = await this.getHoldBalance(params.userId);
    const availableBalance = balance - holdBalance;

    if (availableBalance < params.amount) {
      throw new BadRequestException('Insufficient available balance');
    }

    const [tx] = await db.insert(schema.walletTransactions).values({
      userId: params.userId,
      amount: (-params.amount).toString(),
      type: 'HOLD',
      status: 'SUCCESS',
      referenceId: params.orderId,
      referenceType: 'ORDER',
      note: `Hold for order #${params.orderId}`,
    }).returning();
    return tx;
  }

  /**
   * Release held coins - creates RELEASE transaction
   * Called when order is completed or cancelled
   */
  async releaseHold(
    db: Db,
    params: {
      orderId: number;
      userId: number;
    },
  ) {
    // Find the HOLD transaction for this order
    const holdTx = await this.db
      .select()
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.referenceId, params.orderId),
          eq(schema.walletTransactions.referenceType, 'ORDER'),
          eq(schema.walletTransactions.type, 'HOLD'),
          eq(schema.walletTransactions.status, 'SUCCESS'),
        ),
      )
      .limit(1);

    if (!holdTx[0]) {
      throw new BadRequestException('No hold transaction found for this order');
    }

    // Create RELEASE transaction (returns the held amount back)
    const releaseAmount = Math.abs(parseFloat(holdTx[0].amount));
    const [tx] = await db.insert(schema.walletTransactions).values({
      userId: params.userId,
      amount: releaseAmount.toString(),
      type: 'RELEASE',
      status: 'SUCCESS',
      referenceId: params.orderId,
      referenceType: 'ORDER',
      note: `Release hold for order #${params.orderId}`,
    }).returning();
    return tx;
  }

  /**
   * Settle coins to seller - creates SETTLE transaction
   * Called when order is completed
   */
  async settleToSeller(
    db: Db,
    params: {
      sellerId: number;
      amount: number;
      orderId: number;
    },
  ) {
    const [tx] = await db.insert(schema.walletTransactions).values({
      userId: params.sellerId,
      amount: params.amount.toString(),
      type: 'SETTLE',
      status: 'SUCCESS',
      referenceId: params.orderId,
      referenceType: 'ORDER',
      note: `Settle from order #${params.orderId}`,
    }).returning();
    return tx;
  }

  /**
   * Check if seller's insurance fund is sufficient for a new order
   */
  async checkInsuranceLimit(sellerId: number, orderAmount: number): Promise<boolean> {
    const insuranceBalance = await this.getInsuranceBalance(sellerId);
    const holdBalance = await this.getHoldBalance(sellerId);

    // Total exposure = current hold + new order amount
    const totalExposure = holdBalance + orderAmount;

    // Allow if insurance >= total exposure (or no insurance, then unlimited is fine)
    // But typically: totalExposure <= insuranceBalance * 2 (some buffer)
    // For simplicity: require insurance to cover at least the order amount if they have insurance
    if (insuranceBalance > 0 && totalExposure > insuranceBalance * 2) {
      return false;
    }

    return true;
  }
}
