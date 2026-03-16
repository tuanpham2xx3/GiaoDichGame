import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';

type Db = NodePgDatabase<typeof schema>;

export interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  totalDisputes: number;
  totalRevenue: number;
  totalListings: number;
  activeListings: number;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE) private db: Db) { }

  // ========== Stats ==========

  async getStats(): Promise<AdminStats> {
    const [totalUsers] = await this.db
      .select({ count: count() })
      .from(schema.users);

    const [totalOrders] = await this.db
      .select({ count: count() })
      .from(schema.orders);

    const [totalDisputes] = await this.db
      .select({ count: count() })
      .from(schema.disputeTickets);

    const [totalRevenue] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.walletTransactions.amount}), 0)`,
      })
      .from(schema.walletTransactions)
      .where(
        and(
          eq(schema.walletTransactions.status, 'SUCCESS'),
          sql`${schema.walletTransactions.type} IN ('SETTLE', 'VIP_PURCHASE', 'PIN_PURCHASE')`,
        ),
      );

    const [totalListings] = await this.db
      .select({ count: count() })
      .from(schema.listings);

    const [activeListings] = await this.db
      .select({ count: count() })
      .from(schema.listings)
      .where(eq(schema.listings.status, 'PUBLISHED'));

    return {
      totalUsers: totalUsers?.count || 0,
      totalOrders: totalOrders?.count || 0,
      totalDisputes: totalDisputes?.count || 0,
      totalRevenue: parseFloat(totalRevenue?.total || '0'),
      totalListings: totalListings?.count || 0,
      activeListings: activeListings?.count || 0,
    };
  }

  // ========== User Management ==========

  async getUsers(query: UserListQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.search) {
      conditions.push(
        sql`(${schema.users.username} ILIKE ${'%' + query.search + '%'} OR ${schema.users.email} ILIKE ${'%' + query.search + '%'})`,
      );
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(schema.users.isActive, query.isActive));
    }

    const whereClause = conditions.length > 0
      ? and(...conditions)
      : undefined;

    const [users, total] = await Promise.all([
      this.db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          username: schema.users.username,
          avatarUrl: schema.users.avatarUrl,
          isActive: schema.users.isActive,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .where(whereClause)
        .orderBy(desc(schema.users.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(schema.users)
        .where(whereClause),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total: total[0]?.count || 0,
        totalPages: Math.ceil((total[0]?.count || 0) / limit),
      },
    };
  }

  async getUserById(userId: number) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user roles
    const roles = await this.db
      .select({
        id: schema.roles.id,
        name: schema.roles.name,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, userId));

    // Get stats
    const [listingCount] = await this.db
      .select({ count: count() })
      .from(schema.listings)
      .where(eq(schema.listings.sellerId, userId));

    const [orderCount] = await this.db
      .select({ count: count() })
      .from(schema.orders)
      .where(eq(schema.orders.buyerId, userId));

    return {
      ...user,
      roles,
      stats: {
        totalListings: listingCount?.count || 0,
        totalOrders: orderCount?.count || 0,
      },
    };
  }

  async banUser(userId: number): Promise<{ isActive: boolean }> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.db.update(schema.users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    return { isActive: false };
  }

  async unbanUser(userId: number): Promise<{ isActive: boolean }> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.db.update(schema.users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(schema.users.id, userId));

    return { isActive: true };
  }

  // ========== User Roles ==========

  async getUserRoles(userId: number) {
    return this.db.query.userRoles.findMany({
      where: eq(schema.userRoles.userId, userId),
      with: {
        role: true,
      },
    });
  }

  async assignRole(userId: number, roleId: number, adminId: number) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [userRole] = await this.db.insert(schema.userRoles).values({
      userId,
      roleId,
      assignedBy: adminId,
    }).returning();

    return userRole;
  }

  async removeRole(userId: number, roleId: number) {
    await this.db.delete(schema.userRoles)
      .where(
        and(
          eq(schema.userRoles.userId, userId),
          eq(schema.userRoles.roleId, roleId)
        )
      );
  }

  // ========== Topup Management ==========

  async getPendingTopups() {
    return this.db.query.topupRequests.findMany({
      where: eq(schema.topupRequests.status, 'PENDING'),
      orderBy: [desc(schema.topupRequests.createdAt)],
    });
  }

  async confirmTopup(id: number, adminId: number) {
    const topup = await this.db.query.topupRequests.findFirst({
      where: eq(schema.topupRequests.id, id),
    });
    if (!topup) {
      throw new NotFoundException('Topup request not found');
    }

    return this.db.transaction(async (tx) => {
      // Update topup status
      await tx.update(schema.topupRequests)
        .set({
          status: 'SUCCESS',
          confirmedBy: adminId,
        })
        .where(eq(schema.topupRequests.id, id));

      // Credit user wallet
      await tx.insert(schema.walletTransactions).values({
        userId: topup.userId,
        amount: topup.amountCoin,
        type: 'TOPUP',
        status: 'SUCCESS',
        referenceId: id,
        referenceType: 'topup_request',
      });

      return { success: true, status: 'SUCCESS' };
    });
  }
}
