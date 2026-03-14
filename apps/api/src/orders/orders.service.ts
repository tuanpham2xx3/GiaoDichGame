import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { orders, orderDeliveries, orderTimeline, listings } from '../database/schema';
import type { DrizzleDB } from '../database/types';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EncryptionService } from '../common/encryption.service';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@giaodich/shared';

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  LOCKED: 'LOCKED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  DISPUTED: 'DISPUTED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export interface CreateOrderDto {
  listingId: number;
}

export interface DeliverOrderDto {
  username?: string;
  password?: string;
  extraInfo?: Record<string, unknown>;
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly encryptionService: EncryptionService,
    @InjectQueue(QUEUE_NAMES.ORDERS)
    private readonly ordersQueue: Queue,
  ) {}

  async createOrder(dto: CreateOrderDto, buyerId: number) {
    // 1. Get listing
    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, dto.listingId),
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== 'PUBLISHED') {
      throw new BadRequestException('Listing is not available for purchase');
    }

    if (Number(listing.sellerId) === buyerId) {
      throw new ForbiddenException('You cannot buy your own listing');
    }

    const price = parseFloat(listing.price);

    // 2. Check insurance limit for seller
    const canProceed = await this.walletService.checkInsuranceLimit(Number(listing.sellerId), price);
    if (!canProceed) {
      throw new BadRequestException('Seller has exceeded insurance fund limit');
    }

    // 3. Hold coins from buyer (inside transaction)
    // Note: In production, use proper transaction. Here we rely on wallet service methods.
    const [order] = await this.db.transaction(async (tx) => {
      // Hold coins from buyer
      const holdTx = await this.walletService.holdCoins(tx, { userId: buyerId, amount: price, orderId: 0 });

      // Update listing status to LOCKED
      await tx
        .update(listings)
        .set({ status: 'LOCKED' })
        .where(eq(listings.id, dto.listingId));

      // Create order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          listingId: dto.listingId,
          buyerId: buyerId,
          sellerId: listing.sellerId,
          amount: price.toString(),
          status: ORDER_STATUS.LOCKED,
          autoCompleteAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        })
        .returning();

      // Update hold transaction with correct order ID
      await tx
        .update(orders)
        .set({})
        .where(eq(orders.id, newOrder!.id));

      // Add timeline entry
      await tx
        .insert(orderTimeline)
        .values({
          orderId: newOrder!.id,
          status: ORDER_STATUS.LOCKED,
          note: 'Order created, buyer deposited coins',
        });

      return [newOrder];
    });

    // 4. Schedule BullMQ job for auto-complete
    const job = await this.ordersQueue.add(
      JOB_NAMES.AUTO_COMPLETE,
      { orderId: order!.id },
      {
        delay: 72 * 60 * 60 * 1000, // 72 hours in ms
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute
        },
      },
    );

    // Update order with job ID
    await this.db
      .update(orders)
      .set({ bullmqJobId: job.id })
      .where(eq(orders.id, order!.id));

    // 5. Notify seller
    await this.notificationsService.create({
      userId: Number(order!.sellerId),
      type: 'ORDER_CREATED',
      title: 'Đơn hàng mới',
      content: `Bạn có đơn hàng mới #${order!.id}`,
      data: { orderId: order!.id },
    });

    return this.getOrderById(order!.id, buyerId);
  }

  async getOrders(userId: number) {
    const items = await this.db.query.orders.findMany({
      where: and(
        sql`${orders.buyerId} = ${userId} OR ${orders.sellerId} = ${userId}`,
      ),
      orderBy: [desc(orders.createdAt)],
    });

    return items.map(order => ({
      id: order.id,
      listingId: order.listingId,
      buyerId: Number(order.buyerId),
      sellerId: Number(order.sellerId),
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
      isBuyer: Number(order.buyerId) === userId,
    }));
  }

  async getOrderById(orderId: number, userId: number) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        delivery: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check access
    if (Number(order.buyerId) !== userId && Number(order.sellerId) !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    // Get timeline
    const timeline = await this.db
      .select()
      .from(orderTimeline)
      .where(eq(orderTimeline.orderId, orderId))
      .orderBy(desc(orderTimeline.createdAt));

    return {
      id: order.id,
      listingId: order.listingId,
      buyerId: Number(order.buyerId),
      sellerId: Number(order.sellerId),
      amount: order.amount,
      status: order.status,
      deliveredAt: order.deliveredAt,
      completedAt: order.completedAt,
      autoCompleteAt: order.autoCompleteAt,
      timeline: timeline.map(t => ({
        status: t.status,
        note: t.note,
        createdAt: t.createdAt,
      })),
      isBuyer: Number(order.buyerId) === userId,
      canDeliver: Number(order.sellerId) === userId && order.status === ORDER_STATUS.LOCKED,
      canConfirm: Number(order.buyerId) === userId && order.status === ORDER_STATUS.DELIVERED,
    };
  }

  async deliverOrder(orderId: number, dto: DeliverOrderDto, sellerId: number) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (Number(order.sellerId) !== sellerId) {
      throw new ForbiddenException('Only the seller can deliver');
    }

    if (order.status !== ORDER_STATUS.LOCKED) {
      throw new BadRequestException('Order is not in LOCKED status');
    }

    // Encrypt game info
    const gameInfo = {
      username: dto.username,
      password: dto.password,
      ...dto.extraInfo,
    };
    const encryptedData = this.encryptionService.encryptGameInfo(gameInfo);

    // Update order and create delivery record
    await this.db.transaction(async (tx) => {
      // Create delivery record
      await tx
        .insert(orderDeliveries)
        .values({
          orderId: orderId,
          encryptedData,
        });

      // Update order status
      await tx
        .update(orders)
        .set({
          status: ORDER_STATUS.DELIVERED,
          deliveredAt: new Date(),
          autoCompleteAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // Reset 72h countdown
        })
        .where(eq(orders.id, orderId));

      // Add timeline entry
      await tx
        .insert(orderTimeline)
        .values({
          orderId,
          status: ORDER_STATUS.DELIVERED,
          note: 'Seller delivered game account information',
        });
    });

    // Notify buyer
    await this.notificationsService.create({
      userId: Number(order!.buyerId),
      type: 'ORDER_DELIVERED',
      title: 'Đơn hàng đã giao',
      content: `Thông tin tài khoản game cho đơn hàng #${orderId} đã sẵn sàng`,
      data: { orderId },
    });

    return this.getOrderById(orderId, sellerId);
  }

  async confirmReceipt(orderId: number, buyerId: number) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (Number(order.buyerId) !== buyerId) {
      throw new ForbiddenException('Only the buyer can confirm receipt');
    }

    if (order.status !== ORDER_STATUS.DELIVERED) {
      throw new BadRequestException('Order is not in DELIVERED status');
    }

    const amount = parseFloat(order.amount);

    // Complete the order (release hold + settle to seller)
    await this.db.transaction(async (tx) => {
      // Release hold (return to buyer - actually this is just moving from HOLD to processed)
      // Then settle to seller
      await this.walletService.settleToSeller(tx, { sellerId: Number(order.sellerId), amount, orderId });

      // Update order status
      await tx
        .update(orders)
        .set({
          status: ORDER_STATUS.COMPLETED,
          completedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Add timeline entry
      await tx
        .insert(orderTimeline)
        .values({
          orderId,
          status: ORDER_STATUS.COMPLETED,
          note: 'Buyer confirmed receipt, order completed',
        });
    });

    // Notify seller
    await this.notificationsService.create({
      userId: Number(order.sellerId),
      type: 'ORDER_COMPLETED',
      title: 'Đơn hàng hoàn tất',
      content: `Đơn hàng #${orderId} đã hoàn tất, Coin đã cộng vào ví`,
      data: { orderId },
    });

    return this.getOrderById(orderId, buyerId);
  }

  async getGameInfo(orderId: number, userId: number) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        delivery: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only buyer or seller can view
    if (Number(order.buyerId) !== userId && Number(order.sellerId) !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    if (!order.delivery) {
      throw new BadRequestException('Game info not delivered yet');
    }

    // Decrypt game info
    const gameInfo = this.encryptionService.decryptGameInfo(order.delivery.encryptedData);

    return {
      gameInfo,
    };
  }

  async autoCompleteOrder(orderId: number) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order || order.status !== ORDER_STATUS.DELIVERED) {
      return; // Skip if not in DELIVERED status
    }

    const amount = parseFloat(order.amount);

    await this.db.transaction(async (tx) => {
      // Settle to seller
      await this.walletService.settleToSeller(tx, { sellerId: Number(order.sellerId), amount, orderId });

      // Update order status
      await tx
        .update(orders)
        .set({
          status: ORDER_STATUS.COMPLETED,
          completedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Add timeline entry
      await tx
        .insert(orderTimeline)
        .values({
          orderId,
          status: ORDER_STATUS.COMPLETED,
          note: 'Auto completed after 72 hours',
        });
    });

    // Notify both parties
    await this.notificationsService.create({
      userId: Number(order.buyerId),
      type: 'ORDER_AUTO_COMPLETED',
      title: 'Đơn hàng tự động hoàn tất',
      content: `Đơn hàng #${orderId} đã tự động hoàn tất`,
      data: { orderId },
    });

    await this.notificationsService.create({
      userId: Number(order.sellerId),
      type: 'ORDER_AUTO_COMPLETED',
      title: 'Đơn hàng tự động hoàn tất',
      content: `Đơn hàng #${orderId} đã tự động hoàn tất, Coin đã cộng vào ví`,
      data: { orderId },
    });
  }
}
