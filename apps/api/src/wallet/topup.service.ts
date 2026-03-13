import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';
import { WalletService } from './wallet.service';
import { TopupBankDto, TopupGatewayDto } from './dto/wallet.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class TopupService {
  constructor(
    @Inject(DRIZZLE) private db: Db,
    private walletService: WalletService,
  ) {}

  async createBankRequest(userId: number, dto: TopupBankDto) {
    const reference = `GDG-${Date.now()}`;
    const inserted = await this.db
      .insert(schema.topupRequests)
      .values({
        userId,
        amountCoin: dto.amountCoin.toString(),
        amountVnd: dto.amountCoin.toString(), // 1 Coin = 1 VND
        method: 'BANK_TRANSFER',
        status: 'PENDING',
        gatewayRef: reference,
      })
      .returning();
    if (!inserted[0]) throw new Error('Failed to create topup request');

    return {
      id: inserted[0].id,
      amountCoin: dto.amountCoin,
      reference,
      bankInfo: {
        bankName: process.env.BANK_NAME ?? 'BIDV',
        accountNumber: process.env.BANK_ACCOUNT ?? '123-456-789',
        accountHolder: process.env.BANK_HOLDER ?? 'GIAODICHGAME JSC',
        content: `NAP ${reference}`,
      },
    };
  }

  async confirmTopup(requestId: number, adminId: number) {
    const [topup] = await this.db
      .select()
      .from(schema.topupRequests)
      .where(eq(schema.topupRequests.id, requestId))
      .limit(1);

    if (!topup) throw new NotFoundException('Topup request not found');
    if (topup.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${topup.status}`);
    }

    // Credit the wallet & update request in sequence (no distributed tx needed here)
    await this.walletService.credit(this.db, {
      userId: topup.userId,
      amount: parseFloat(topup.amountCoin),
      type: 'TOPUP',
      referenceId: topup.id,
      referenceType: 'TOPUP_REQUEST',
      note: `Nạp Coin - ${topup.gatewayRef ?? ''}`,
    });

    await this.db
      .update(schema.topupRequests)
      .set({ status: 'SUCCESS', confirmedBy: adminId })
      .where(eq(schema.topupRequests.id, requestId));

    return { status: 'SUCCESS', amountCoin: topup.amountCoin };
  }

  async initGatewayTopup(userId: number, dto: TopupGatewayDto) {
    const reference = `GDG-GW-${uuidv4().slice(0, 8).toUpperCase()}`;
    const inserted = await this.db
      .insert(schema.topupRequests)
      .values({
        userId,
        amountCoin: dto.amountCoin.toString(),
        amountVnd: dto.amountCoin.toString(),
        method: dto.method,
        status: 'PENDING',
        gatewayRef: reference,
      })
      .returning();
    if (!inserted[0]) throw new Error('Failed to create gateway topup');

    return {
      id: inserted[0].id,
      redirectUrl: `https://mockcoingateway.dev/pay?ref=${reference}&amount=${dto.amountCoin}&method=${dto.method}`,
      reference,
    };
  }

  async handleWebhook(body: { reference: string; status: 'SUCCESS' | 'FAILED' }) {
    const [topup] = await this.db
      .select()
      .from(schema.topupRequests)
      .where(eq(schema.topupRequests.gatewayRef, body.reference))
      .limit(1);

    if (!topup || topup.status !== 'PENDING') return { ok: true };

    if (body.status === 'SUCCESS') {
      await this.walletService.credit(this.db, {
        userId: topup.userId,
        amount: parseFloat(topup.amountCoin),
        type: 'TOPUP',
        referenceId: topup.id,
        referenceType: 'TOPUP_REQUEST',
        note: `Nạp Coin gateway - ${topup.gatewayRef ?? ''}`,
      });
      await this.db
        .update(schema.topupRequests)
        .set({ status: 'SUCCESS' })
        .where(eq(schema.topupRequests.id, topup.id));
    } else {
      await this.db
        .update(schema.topupRequests)
        .set({ status: 'FAILED' })
        .where(eq(schema.topupRequests.id, topup.id));
    }

    return { ok: true };
  }

  async getPendingRequests() {
    return this.db
      .select({
        id: schema.topupRequests.id,
        userId: schema.topupRequests.userId,
        amountCoin: schema.topupRequests.amountCoin,
        method: schema.topupRequests.method,
        gatewayRef: schema.topupRequests.gatewayRef,
        createdAt: schema.topupRequests.createdAt,
      })
      .from(schema.topupRequests)
      .where(eq(schema.topupRequests.status, 'PENDING'))
      .orderBy(schema.topupRequests.createdAt);
  }
}
