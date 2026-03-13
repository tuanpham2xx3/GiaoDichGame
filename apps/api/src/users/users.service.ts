import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, inArray, sql } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';
import { UpdateProfileDto } from './dto/update-profile.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: Db) {}

  async create(data: {
    email: string;
    passwordHash: string;
    username: string;
  }) {
    const existing = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, data.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const usernameCheck = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, data.username))
      .limit(1);

    if (usernameCheck.length > 0) {
      throw new ConflictException('Username already taken');
    }

    const insertResult = await this.db
      .insert(schema.users)
      .values({
        email: data.email,
        passwordHash: data.passwordHash,
        username: data.username,
      })
      .returning();

    if (!insertResult[0]) throw new Error('Failed to create user');
    return insertResult[0];
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return user ?? null;
  }

  async findById(id: number) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        username: schema.users.username,
        avatarUrl: schema.users.avatarUrl,
        isActive: schema.users.isActive,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    if (dto.username) {
      const check = await this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.username, dto.username))
        .limit(1);
      const existingUser = check[0];
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Username already taken');
      }
    }

    const [updated] = await this.db
      .update(schema.users)
      .set({
        ...(dto.username ? { username: dto.username } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        username: schema.users.username,
        avatarUrl: schema.users.avatarUrl,
      });

    return updated;
  }

  async getPermissions(userId: number): Promise<string[]> {
    // Check if ADMIN system role
    const adminCheck = await this.db
      .select()
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(
        and(
          eq(schema.userRoles.userId, userId),
          eq(schema.roles.name, 'ADMIN'),
          eq(schema.roles.isSystem, true),
        ),
      )
      .limit(1);

    if (adminCheck.length > 0) {
      // Admin has all permissions
      const allPerms = await this.db
        .select({ key: schema.permissions.key })
        .from(schema.permissions);
      return allPerms.map((p) => p.key);
    }

    // Get roles for user
    const userRoleRows = await this.db
      .select({ roleId: schema.userRoles.roleId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId));

    if (userRoleRows.length === 0) return [];

    const roleIds = userRoleRows.map((r) => r.roleId);

    const permRows = await this.db
      .select({ key: schema.permissions.key })
      .from(schema.rolePermissions)
      .innerJoin(
        schema.permissions,
        eq(schema.rolePermissions.permissionId, schema.permissions.id),
      )
      .where(inArray(schema.rolePermissions.roleId, roleIds));

    return [...new Set(permRows.map((p) => p.key))];
  }

  async getTransactionHistory(userId: number) {
    return this.db
      .select({
        id: schema.walletTransactions.id,
        amount: schema.walletTransactions.amount,
        type: schema.walletTransactions.type,
        status: schema.walletTransactions.status,
        referenceType: schema.walletTransactions.referenceType,
        note: schema.walletTransactions.note,
        createdAt: schema.walletTransactions.createdAt,
      })
      .from(schema.walletTransactions)
      .where(eq(schema.walletTransactions.userId, userId))
      .orderBy(sql`${schema.walletTransactions.createdAt} DESC`)
      .limit(50);
  }

  async assignDefaultRole(userId: number) {
    // Find USER system role
    const [userRole] = await this.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.name, 'USER'), eq(schema.roles.isSystem, true)))
      .limit(1);

    if (!userRole) return;

    await this.db.insert(schema.userRoles).values({
      userId,
      roleId: userRole.id,
    }).onConflictDoNothing();
  }
}
