import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, count } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { notifications } from '../database/schema';
import type { DrizzleDB } from '../database/types';

export interface CreateNotificationDto {
  userId: number;
  type: string;
  title: string;
  content?: string;
  data?: Record<string, unknown>;
}

export interface NotificationQueryDto {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
  ) {}

  async create(dto: CreateNotificationDto) {
    const [notification] = await this.db
      .insert(notifications)
      .values({
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content ?? null,
        data: dto.data ?? null,
        isRead: false,
      })
      .returning();

    return notification;
  }

  async getNotifications(userId: number, query: NotificationQueryDto = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(whereClause);

    const items = await this.db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      total: totalResult?.count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult?.count ?? 0) / limit),
    };
  }

  async getUnreadCount(userId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      );

    return result?.count ?? 0;
  }

  async markAsRead(notificationId: number, userId: number) {
    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
        ),
      )
      .returning();

    return updated;
  }

  async markAllAsRead(userId: number) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      );

    return { success: true };
  }
}
