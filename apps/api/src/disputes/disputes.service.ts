import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import {
  orders,
  disputeTickets,
  disputeMessages,
  users,
  walletTransactions,
  notifications,
  disputeSettings,
  disputeEvidence,
  userRoles,
} from '../database/schema';
import type { DrizzleDB } from '../database/types';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '@giaodich/shared';
import { CreateDisputeDto, SendMessageDto, JudgeDisputeDto } from './dto/dispute.dto';

export const DISPUTE_STATUS = {
  OPEN: 'OPEN',
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

export const DISPUTE_REASONS = {
  ACCOUNT_NOT_RECEIVED: 'account_not_received',
  ACCOUNT_INVALID: 'account_invalid',
  ACCOUNT_NOT_AS_DESCRIBED: 'account_not_as_described',
  OTHER: 'other',
} as const;

export type DisputeStatus = typeof DISPUTE_STATUS[keyof typeof DISPUTE_STATUS];

@Injectable()
export class DisputesService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    @InjectQueue(QUEUE_NAMES.DISPUTES)
    private readonly disputesQueue: Queue,
  ) {}

  async createDispute(dto: CreateDisputeDto, buyerId: number) {
    const orderId = parseInt(dto.orderId);

    // 1. Validate order exists and belongs to buyer
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (Number(order.buyerId) !== buyerId) {
      throw new ForbiddenException('You can only open disputes for your own orders');
    }

    // 2. Check order status is DELIVERED
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Order must be in DELIVERED status to open dispute');
    }

    // 3. Check 72h since delivered
    const deliveredAt = order.deliveredAt;
    if (deliveredAt) {
      const hoursSinceDelivered = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceDelivered > 72) {
        throw new BadRequestException('Dispute window has expired (72h after delivery)');
      }
    }

    // 4. Check if dispute already exists
    const existingDispute = await this.db.query.disputeTickets.findFirst({
      where: eq(disputeTickets.orderId, orderId),
    });

    if (existingDispute) {
      throw new BadRequestException('Dispute already exists for this order');
    }

    // 5. Get auto_refund_hours from settings
    const settings = await this.getSettings();
    const autoRefundHours = parseInt(settings.auto_refund_hours || '6');
    const sellerDeadline = new Date(Date.now() + autoRefundHours * 60 * 60 * 1000);

    // 6. Create dispute ticket
    const [dispute] = await this.db
      .insert(disputeTickets)
      .values({
        orderId: orderId,
        buyerId: buyerId,
        sellerId: order.sellerId,
        reason: dto.reason,
        status: DISPUTE_STATUS.OPEN,
        sellerDeadline: sellerDeadline,
      })
      .returning();

    if (!dispute) {
      throw new Error('Failed to create dispute');
    }

    // 7. Add initial message with description
    await this.db.insert(disputeMessages).values({
      ticketId: dispute.id,
      senderId: buyerId,
      message: dto.description,
    });

    // 8. Update order status to DISPUTED
    await this.db
      .update(orders)
      .set({ status: 'DISPUTED' })
      .where(eq(orders.id, orderId));

    // 9. Schedule BullMQ job for auto refund
    const job = await this.disputesQueue.add(
      JOB_NAMES.DISPUTE_AUTO_REFUND,
      { disputeId: dispute.id },
      {
        delay: autoRefundHours * 60 * 60 * 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      },
    );

    // 10. Schedule reminder job
    const reminderDelay = (autoRefundHours / 2) * 60 * 60 * 1000;
    await this.disputesQueue.add(
      JOB_NAMES.DISPUTE_REMINDER,
      { disputeId: dispute.id },
      {
        delay: reminderDelay,
        attempts: 2,
      },
    );

    // 11. Notify seller
    await this.notificationsService.create({
      userId: Number(order.sellerId),
      type: 'DISPUTE_OPENED',
      title: 'Có tranh chấp mới',
      content: `Người mua đã mở tranh chấp cho đơn hàng #${orderId}`,
      data: { disputeId: dispute.id, orderId },
    });

    // 12. Notify admins
    await this.notifyAdmins(dispute.id, orderId);

    return this.getDisputeById(dispute.id, buyerId);
  }

  async getDisputes(userId: number, filters?: { status?: string }) {
    const query = this.db
      .select({
        id: disputeTickets.id,
        orderId: disputeTickets.orderId,
        buyerId: disputeTickets.buyerId,
        sellerId: disputeTickets.sellerId,
        reason: disputeTickets.reason,
        status: disputeTickets.status,
        sellerDeadline: disputeTickets.sellerDeadline,
        resolution: disputeTickets.resolution,
        createdAt: disputeTickets.createdAt,
        resolvedAt: disputeTickets.resolvedAt,
      })
      .from(disputeTickets)
      .$dynamic();

    const conditions = [
      or(
        eq(disputeTickets.buyerId, userId),
        eq(disputeTickets.sellerId, userId),
      ),
    ];

    if (filters?.status) {
      conditions.push(eq(disputeTickets.status, filters.status));
    }

    const disputes = await query
      .where(and(...conditions))
      .orderBy(desc(disputeTickets.createdAt));

    return disputes.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      buyerId: Number(d.buyerId),
      sellerId: Number(d.sellerId),
      reason: d.reason,
      status: d.status,
      sellerDeadline: d.sellerDeadline,
      resolution: d.resolution,
      createdAt: d.createdAt,
      resolvedAt: d.resolvedAt,
      isBuyer: d.buyerId === userId,
    }));
  }

  async getDisputeById(disputeId: number, userId: number) {
    const dispute = await this.db.query.disputeTickets.findFirst({
      where: eq(disputeTickets.id, disputeId),
      with: {
        messages: {
          orderBy: [desc(disputeMessages.createdAt)],
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check access
    const isParticipant =
      Number(dispute.buyerId) === userId ||
      Number(dispute.sellerId) === userId;

    // Check if user is admin (simplified - in production would check role)
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userRoles: true,
      },
    });

    const isAdmin = user?.userRoles?.some((ur) => ur.roleId === 1) || false;

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    // Get order info
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, Number(dispute.orderId)),
      with: {
        listing: true,
      },
    });

    return {
      id: dispute.id,
      orderId: dispute.orderId,
      buyerId: Number(dispute.buyerId),
      sellerId: Number(dispute.sellerId),
      reason: dispute.reason,
      status: dispute.status,
      resolution: dispute.resolution,
      resolutionNote: dispute.resolutionNote,
      sellerDeadline: dispute.sellerDeadline,
      createdAt: dispute.createdAt,
      resolvedAt: dispute.resolvedAt,
      isBuyer: Number(dispute.buyerId) === userId,
      isSeller: Number(dispute.sellerId) === userId,
      isAdmin,
      order: order
        ? {
            id: order.id,
            listingTitle: order.listing?.title,
            amount: order.amount,
            status: order.status,
          }
        : null,
      messages: [],
    };
  }

  async sendMessage(disputeId: number, dto: SendMessageDto, senderId: number) {
    const dispute = await this.db.query.disputeTickets.findFirst({
      where: eq(disputeTickets.id, disputeId),
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if sender is participant or admin
    const isParticipant =
      Number(dispute.buyerId) === senderId ||
      Number(dispute.sellerId) === senderId;

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, senderId),
      with: {
        userRoles: true,
      },
    });

    const isAdmin = user?.userRoles?.some((ur) => ur.roleId === 1) || false;

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('You cannot send messages in this dispute');
    }

    // Determine sender role
    let senderRole: 'buyer' | 'seller' | 'mod' = 'buyer';
    if (Number(dispute.buyerId) === senderId) {
      senderRole = 'buyer';
    } else if (Number(dispute.sellerId) === senderId) {
      senderRole = 'seller';
    } else {
      senderRole = 'mod';
    }

    // Create message
    const [message] = await this.db
      .insert(disputeMessages)
      .values({
        ticketId: disputeId,
        senderId: senderId,
        message: dto.message,
      })
      .returning();

    if (!message) {
      throw new Error('Failed to send message');
    }

    // Update dispute status if needed
    if (dispute.status === DISPUTE_STATUS.OPEN) {
      await this.db
        .update(disputeTickets)
        .set({ status: DISPUTE_STATUS.UNDER_REVIEW })
        .where(eq(disputeTickets.id, disputeId));
    }

    // Notify other party
    const notifyUserId =
      senderRole === 'buyer' ? Number(dispute.sellerId) : Number(dispute.buyerId);

    await this.notificationsService.create({
      userId: notifyUserId,
      type: 'DISPUTE_MESSAGE',
      title: 'Tin nhắn mới trong tranh chấp',
      content: `Có tin nhắn mới trong tranh chấp đơn hàng #${dispute.orderId}`,
      data: { disputeId, messageId: message.id },
    });

    return message;
  }

  async getMessages(disputeId: number, userId: number) {
    const dispute = await this.db.query.disputeTickets.findFirst({
      where: eq(disputeTickets.id, disputeId),
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check access
    const isParticipant =
      Number(dispute.buyerId) === userId ||
      Number(dispute.sellerId) === userId;

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userRoles: true,
      },
    });

    const isAdmin = user?.userRoles?.some((ur) => ur.roleId === 1) || false;

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    const messages = await this.db
      .select()
      .from(disputeMessages)
      .where(eq(disputeMessages.ticketId, disputeId))
      .orderBy(desc(disputeMessages.createdAt));

    return messages.map((m) => ({
      id: m.id,
      senderId: Number(m.senderId),
      message: m.message,
      attachmentUrls: m.attachmentUrls,
      createdAt: m.createdAt,
    }));
  }

  // Evidence Upload
  async uploadEvidence(
    disputeId: number,
    file: {
      filename: string;
      path: string;
      mimetype: string;
      size: number;
    },
    userId: number,
  ) {
    const dispute = await this.db.query.disputeTickets.findFirst({
      where: eq(disputeTickets.id, disputeId),
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if sender is participant or admin
    const isParticipant =
      Number(dispute.buyerId) === userId ||
      Number(dispute.sellerId) === userId;

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userRoles: true,
      },
    });

    const isAdmin = user?.userRoles?.some((ur) => ur.roleId === 1) || false;

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('You cannot upload evidence in this dispute');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: jpg, png, pdf');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    // Check max files per dispute
    const existingEvidence = await this.db
      .select()
      .from(disputeEvidence)
      .where(eq(disputeEvidence.ticketId, disputeId));

    if (existingEvidence.length >= 10) {
      throw new BadRequestException('Maximum 10 files allowed per dispute');
    }

    // Create evidence record
    const [evidence] = await this.db
      .insert(disputeEvidence)
      .values({
        ticketId: disputeId,
        uploadedBy: userId,
        filePath: file.path,
        fileName: file.filename,
        fileType: file.mimetype,
        fileSize: file.size,
      })
      .returning();

    // Update the initial message with attachment URL
    const firstMessage = await this.db
      .select()
      .from(disputeMessages)
      .where(eq(disputeMessages.ticketId, disputeId))
      .orderBy(disputeMessages.createdAt)
      .limit(1);

    if (firstMessage.length > 0 && firstMessage[0]) {
      const existingUrls = firstMessage[0].attachmentUrls || [];
      await this.db
        .update(disputeMessages)
        .set({ attachmentUrls: [...existingUrls, file.path] })
        .where(eq(disputeMessages.id, firstMessage[0].id));
    }

    return evidence;
  }

  async getEvidence(disputeId: number, userId: number) {
    const dispute = await this.db.query.disputeTickets.findFirst({
      where: eq(disputeTickets.id, disputeId),
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check access
    const isParticipant =
      Number(dispute.buyerId) === userId ||
      Number(dispute.sellerId) === userId;

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userRoles: true,
      },
    });

    const isAdmin = user?.userRoles?.some((ur) => ur.roleId === 1) || false;

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    const evidence = await this.db
      .select()
      .from(disputeEvidence)
      .where(eq(disputeEvidence.ticketId, disputeId))
      .orderBy(desc(disputeEvidence.createdAt));

    return evidence.map((e) => ({
      id: e.id,
      uploadedBy: Number(e.uploadedBy),
      fileName: e.fileName,
      fileType: e.fileType,
      fileSize: e.fileSize,
      filePath: e.filePath,
      createdAt: e.createdAt,
    }));
  }

  async withdrawDispute(disputeId: number, userId: number) {
    const dispute = await this.db.query.disputeTickets.findFirst({
      where: eq(disputeTickets.id, disputeId),
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (Number(dispute.buyerId) !== userId) {
      throw new ForbiddenException('Only the buyer can withdraw the dispute');
    }

    if (dispute.status === DISPUTE_STATUS.RESOLVED) {
      throw new BadRequestException('Cannot withdraw a resolved dispute');
    }

    // Update dispute status
    await this.db
      .update(disputeTickets)
      .set({
        status: DISPUTE_STATUS.WITHDRAWN,
        resolvedAt: new Date(),
      })
      .where(eq(disputeTickets.id, disputeId));

    // Restore order status to DELIVERED
    await this.db
      .update(orders)
      .set({ status: 'DELIVERED' })
      .where(eq(orders.id, Number(dispute.orderId)));

    // Notify seller
    await this.notificationsService.create({
      userId: Number(dispute.sellerId),
      type: 'DISPUTE_WITHDRAWN',
      title: 'Tranh chấp đã được rút',
      content: `Người mua đã rút tranh chấp cho đơn hàng #${dispute.orderId}`,
      data: { disputeId, orderId: dispute.orderId },
    });

    return { success: true, message: 'Dispute withdrawn successfully' };
  }

  async judgeDispute(disputeId: number, dto: JudgeDisputeDto, adminId: number) {
    const dispute = await this.db.query.disputeTickets.findFirst({
      where: eq(disputeTickets.id, disputeId),
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status === DISPUTE_STATUS.RESOLVED) {
      throw new BadRequestException('Dispute already resolved');
    }

    // Get order for wallet operations
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, Number(dispute.orderId)),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Perform wallet operations based on decision
    if (dto.decision === 'REFUND') {
      // Release hold back to buyer
      await this.walletService.refundToBuyer(
        Number(order.buyerId),
        parseFloat(order.amount),
        Number(dispute.orderId),
      );
    } else {
      // Settle to seller
      const db = this.db as any;
      await this.walletService.settleToSeller(
        db,
        { sellerId: Number(order.sellerId), amount: parseFloat(order.amount), orderId: Number(dispute.orderId) }
      );
    }

    // Update dispute status
    await this.db
      .update(disputeTickets)
      .set({
        status: DISPUTE_STATUS.RESOLVED,
        resolution: dto.decision,
        resolutionNote: dto.note || null,
        resolvedAt: new Date(),
        assignedTo: adminId,
      })
      .where(eq(disputeTickets.id, disputeId));

    // Update order status
    await this.db
      .update(orders)
      .set({
        status: dto.decision === 'REFUND' ? 'CANCELLED' : 'COMPLETED',
        completedAt: dto.decision === 'RELEASE' ? new Date() : null,
      })
      .where(eq(orders.id, Number(dispute.orderId)));

    // Notify both parties
    await this.notificationsService.create({
      userId: Number(dispute.buyerId),
      type: 'DISPUTE_RESOLVED',
      title: 'Tranh chấp đã được giải quyết',
      content: `Tranh chấp đơn hàng #${dispute.orderId} đã được giải quyết: ${dto.decision === 'REFUND' ? 'Hoàn tiền' : 'Giải ngân'}`,
      data: { disputeId, decision: dto.decision },
    });

    await this.notificationsService.create({
      userId: Number(dispute.sellerId),
      type: 'DISPUTE_RESOLVED',
      title: 'Tranh chấp đã được giải quyết',
      content: `Tranh chấp đơn hàng #${dispute.orderId} đã được giải quyết: ${dto.decision === 'REFUND' ? 'Hoàn tiền cho người mua' : 'Giải ngân cho bạn'}`,
      data: { disputeId, decision: dto.decision },
    });

    return this.getDisputeById(disputeId, adminId);
  }

  // Admin methods
  async getAllDisputes(filters?: {
    status?: string;
    buyerId?: number;
    sellerId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(disputeTickets.status, filters.status));
    }
    if (filters?.buyerId) {
      conditions.push(eq(disputeTickets.buyerId, filters.buyerId));
    }
    if (filters?.sellerId) {
      conditions.push(eq(disputeTickets.sellerId, filters.sellerId));
    }

    const disputes = await this.db
      .select()
      .from(disputeTickets)
      .$dynamic()
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(disputeTickets.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(disputeTickets)
      .$dynamic()
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = parseInt(countResult[0]?.count?.toString() || '0');

    return {
      data: disputes.map((d) => ({
        id: d.id,
        orderId: d.orderId,
        buyerId: Number(d.buyerId),
        sellerId: Number(d.sellerId),
        reason: d.reason,
        status: d.status,
        resolution: d.resolution,
        sellerDeadline: d.sellerDeadline,
        createdAt: d.createdAt,
        resolvedAt: d.resolvedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDisputeStats() {
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(disputeTickets);

    const openResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(disputeTickets)
      .where(eq(disputeTickets.status, DISPUTE_STATUS.OPEN));

    const underReviewResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(disputeTickets)
      .where(eq(disputeTickets.status, DISPUTE_STATUS.UNDER_REVIEW));

    const resolvedResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(disputeTickets)
      .where(eq(disputeTickets.status, DISPUTE_STATUS.RESOLVED));

    const refundedResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(disputeTickets)
      .where(eq(disputeTickets.resolution, 'REFUND'));

    const releasedResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(disputeTickets)
      .where(eq(disputeTickets.resolution, 'RELEASE'));

    return {
      total: parseInt(totalResult[0]?.count?.toString() || '0'),
      open: parseInt(openResult[0]?.count?.toString() || '0'),
      underReview: parseInt(underReviewResult[0]?.count?.toString() || '0'),
      resolved: parseInt(resolvedResult[0]?.count?.toString() || '0'),
      refunded: parseInt(refundedResult[0]?.count?.toString() || '0'),
      released: parseInt(releasedResult[0]?.count?.toString() || '0'),
    };
  }

  // Settings
  async getSettings() {
    // Default settings
    const defaultSettings = {
      auto_refund_hours: '6',
    };

    try {
      const settings = await this.db
        .select()
        .from(disputeSettings)
        .where(eq(disputeSettings.key, 'auto_refund_hours'));

      if (settings.length > 0 && settings[0]) {
        return {
          ...defaultSettings,
          auto_refund_hours: settings[0].value,
        };
      }
    } catch (error) {
      // Table might not exist yet, return defaults
    }

    return defaultSettings;
  }

  async updateSettings(key: string, value: string, adminId: number) {
    // Upsert settings
    await this.db
      .insert(disputeSettings)
      .values({
        key,
        value,
        updatedBy: adminId,
      })
      .onConflictDoUpdate({
        target: disputeSettings.key,
        set: {
          value,
          updatedBy: adminId,
          updatedAt: new Date(),
        },
      });

    return { success: true, key, value };
  }

  // Auto refund (called by BullMQ)
  async autoRefundDispute(disputeId: number) {
    const dispute = await this.db.query.disputeTickets.findFirst({
      where: eq(disputeTickets.id, disputeId),
    });

    if (!dispute || dispute.status !== DISPUTE_STATUS.OPEN) {
      return; // Skip if already resolved or doesn't exist
    }

    // Check if seller has replied (messages from seller)
    const sellerMessages = await this.db
      .select()
      .from(disputeMessages)
      .where(
        and(
          eq(disputeMessages.ticketId, disputeId),
          eq(disputeMessages.senderId, dispute.sellerId),
        ),
      );

    if (sellerMessages.length > 0) {
      return; // Seller has replied, don't auto refund
    }

    // Auto refund to buyer
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, Number(dispute.orderId)),
    });

    if (order) {
      await this.walletService.refundToBuyer(
        Number(order.buyerId),
        parseFloat(order.amount),
        Number(dispute.orderId),
      );

      // Update dispute
      await this.db
        .update(disputeTickets)
        .set({
          status: DISPUTE_STATUS.RESOLVED,
          resolution: 'REFUND',
          resolutionNote: 'Auto refund: Seller did not respond within deadline',
          resolvedAt: new Date(),
        })
        .where(eq(disputeTickets.id, disputeId));

      // Update order
      await this.db
        .update(orders)
        .set({ status: 'CANCELLED' })
        .where(eq(orders.id, Number(dispute.orderId)));

      // Notify
      await this.notificationsService.create({
        userId: Number(order.buyerId),
        type: 'DISPUTE_AUTO_REFUNDED',
        title: 'Tranh chấp tự động hoàn tiền',
        content: `Tranh chấp đơn hàng #${dispute.orderId} đã tự động hoàn tiền do Seller không phản hồi`,
        data: { disputeId },
      });
    }
  }

  private async notifyAdmins(disputeId: number, orderId: number) {
    // Get admin users (simplified - in production would query by role)
    const admins = await this.db
      .select()
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .where(eq(userRoles.roleId, 1))
      .limit(10);

    for (const admin of admins) {
      await this.notificationsService.create({
        userId: admin.users.id,
        type: 'NEW_DISPUTE',
        title: 'Tranh chấp mới cần xử lý',
        content: `Có tranh chấp mới cần xem xét cho đơn hàng #${orderId}`,
        data: { disputeId, orderId },
      });
    }
  }
}
