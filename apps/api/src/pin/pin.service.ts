import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ListingsService } from '../listings/listings.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@giaodich/shared';

type Db = NodePgDatabase<typeof schema>;
type PinConfigType = typeof schema.pinConfig.$inferSelect;

export interface CreatePinConfigDto {
  pricePerDay: number;
  maxActivePins?: number;
}

export interface UpdatePinConfigDto {
  pricePerDay?: number;
  maxActivePins?: number;
}

export interface PurchasePinDto {
  listingId: number;
  days: number;
}

@Injectable()
export class PinService {
  constructor(
    @Inject(DRIZZLE) private db: Db,
    private walletService: WalletService,
    private notificationsService: NotificationsService,
    private listingsService: ListingsService,
    @InjectQueue(QUEUE_NAMES.PREMIUM) private premiumQueue: Queue,
  ) {}

  // ========== Admin: Pin Config ==========

  async getConfig(): Promise<PinConfigType | undefined> {
    const configs = await this.db.query.pinConfig.findMany({
      orderBy: [desc(schema.pinConfig.id)],
      limit: 1,
    });
    return configs[0];
  }

  async updateConfig(dto: UpdatePinConfigDto): Promise<PinConfigType> {
    const existing = await this.getConfig();
    if (existing) {
      const [updated] = await this.db.update(schema.pinConfig)
        .set({
          ...(dto.pricePerDay && { pricePerDay: dto.pricePerDay.toString() }),
          ...(dto.maxActivePins !== undefined && { maxActivePins: dto.maxActivePins }),
        })
        .where(eq(schema.pinConfig.id, existing.id))
        .returning();
      if (!updated) {
        throw new Error('Failed to update pin config');
      }
      return updated;
    } else {
      const [created] = await this.db.insert(schema.pinConfig).values({
        pricePerDay: dto.pricePerDay?.toString() ?? '10',
        maxActivePins: dto.maxActivePins ?? 5,
      }).returning();
      if (!created) {
        throw new Error('Failed to create pin config');
      }
      return created;
    }
  }

  // ========== User: Purchase Pin ==========

  async purchasePin(userId: number, dto: PurchasePinDto): Promise<typeof schema.listingPins.$inferSelect> {
    // Get config
    const config = await this.getConfig();
    if (!config) {
      throw new BadRequestException('Pin configuration not available');
    }

    // Verify listing exists and belongs to user
    const listing = await this.db.query.listings.findFirst({
      where: eq(schema.listings.id, dto.listingId),
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    if (listing.sellerId !== userId) {
      throw new BadRequestException('You can only pin your own listings');
    }

    // Check max active pins
    const activePins = await this.db.query.listingPins.findMany({
      where: and(
        eq(schema.listingPins.listingId, dto.listingId),
        sql`${schema.listingPins.expiresAt} > NOW()`,
      ),
    });

    const maxPins = config.maxActivePins ?? 5;
    if (activePins.length >= maxPins) {
      throw new BadRequestException(`Maximum ${maxPins} active pins allowed per listing`);
    }

    // Calculate price
    const pricePerDay = parseFloat(config.pricePerDay);
    const totalPrice = pricePerDay * dto.days;

    // Check balance
    const balance = await this.walletService.getBalance(userId);
    if (balance < totalPrice) {
      throw new BadRequestException('Insufficient balance');
    }

    const now = new Date();
    const startsAt = now;
    const expiresAt = new Date(now.getTime() + dto.days * 24 * 60 * 60 * 1000);

    // Create pin and update listing
    const [pin] = await this.db.transaction(async (tx) => {
      // Deduct from wallet
      await this.walletService.debit(tx, {
        userId,
        amount: totalPrice,
        type: 'PIN_PURCHASE',
        referenceType: 'listing_pin',
        referenceId: dto.listingId,
        note: `Purchase Pin for listing #${dto.listingId}, ${dto.days} days`,
      });

      // Create pin record
      return tx.insert(schema.listingPins).values({
        listingId: dto.listingId,
        userId,
        days: dto.days,
        pricePaid: totalPrice.toString(),
        startsAt,
        expiresAt,
      }).returning();
    });

    if (!pin) {
      throw new Error('Failed to create pin');
    }

    // Update listing to show as pinned
    await this.db.update(schema.listings)
      .set({
        isPinned: true,
        pinExpiresAt: expiresAt,
      })
      .where(eq(schema.listings.id, dto.listingId));

    // Schedule expiry job
    const delay = expiresAt.getTime() - now.getTime();
    await this.premiumQueue.add(
      JOB_NAMES.PIN_EXPIRY,
      { pinId: pin.id },
      { delay: Math.max(0, delay), removeOnComplete: true },
    );

    // Update pin with job ID
    await this.db.update(schema.listingPins)
      .set({ bullmqJobId: `${JOB_NAMES.PIN_EXPIRY}-${pin.id}` })
      .where(eq(schema.listingPins.id, pin.id));

    // Send notification
    await this.notificationsService.create({
      userId,
      type: 'PIN_PURCHASED',
      title: 'Mua Pin thành công',
      content: `Bài đăng #${dto.listingId} đã được ghim lên đầu trong ${dto.days} ngày`,
    });

    return pin;
  }

  // ========== Pin Expiry ==========

  async expirePin(pinId: number): Promise<void> {
    const pin = await this.db.query.listingPins.findFirst({
      where: eq(schema.listingPins.id, pinId),
    });

    if (!pin) {
      console.log(`Pin ${pinId} not found, skipping expiry`);
      return;
    }

    // Deactivate pin
    await this.db.update(schema.listingPins)
      .set({})
      .where(eq(schema.listingPins.id, pinId));

    // Check if there are other active pins for this listing
    const otherActivePins = await this.db.query.listingPins.findMany({
      where: and(
        eq(schema.listingPins.listingId, pin.listingId),
        sql`${schema.listingPins.expiresAt} > NOW()`,
        sql`${schema.listingPins.id} != ${pinId}`,
      ),
    });

    // If no other active pins, unpin the listing
    if (otherActivePins.length === 0) {
      await this.db.update(schema.listings)
        .set({
          isPinned: false,
          pinExpiresAt: null,
        })
        .where(eq(schema.listings.id, pin.listingId));
    } else {
      // Update listing to next pin expiry
      const sortedPins = otherActivePins.sort((a, b) => 
        new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
      );
      const nextPin = sortedPins[0];
      if (nextPin) {
        await this.db.update(schema.listings)
          .set({ pinExpiresAt: nextPin.expiresAt })
          .where(eq(schema.listings.id, pin.listingId));
      }
    }

    // Send notification
    await this.notificationsService.create({
      userId: pin.userId,
      type: 'PIN_EXPIRED',
      title: 'Pin đã hết hạn',
      content: `Pin của bài đăng #${pin.listingId} đã hết hạn`,
    });
  }

  // ========== Listing Pins ==========

  async getListingPins(listingId: number): Promise<typeof schema.listingPins.$inferSelect[]> {
    return this.db.query.listingPins.findMany({
      where: and(
        eq(schema.listingPins.listingId, listingId),
        sql`${schema.listingPins.expiresAt} > NOW()`,
      ),
      orderBy: [desc(schema.listingPins.expiresAt)],
    });
  }

  async getMyPins(userId: number): Promise<typeof schema.listingPins.$inferSelect[]> {
    return this.db.query.listingPins.findMany({
      where: and(
        eq(schema.listingPins.userId, userId),
        sql`${schema.listingPins.expiresAt} > NOW()`,
      ),
      orderBy: [desc(schema.listingPins.expiresAt)],
    });
  }

  // ========== Calculate Price ==========

  async calculatePrice(days: number, userId?: number): Promise<{
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
  }> {
    const config = await this.getConfig();
    if (!config) {
      return { originalPrice: 0, discountedPrice: 0, discountPercent: 0 };
    }

    const pricePerDay = parseFloat(config.pricePerDay);
    const originalPrice = pricePerDay * days;

    let discountPercent = 0;
    if (userId) {
      // Check if user has VIP
      const { VipService } = await import('../vip/vip.service');
      const vipService = new VipService(
        this.db as any,
        {} as any,
        {} as any,
      );
      const benefits = await vipService.getUserBenefits(userId);
      discountPercent = benefits.discountPercent;
    }

    const discountedPrice = originalPrice * (1 - discountPercent / 100);

    return {
      originalPrice,
      discountedPrice,
      discountPercent,
    };
  }
}
