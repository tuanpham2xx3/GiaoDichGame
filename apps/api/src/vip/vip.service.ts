import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, desc } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

type Db = NodePgDatabase<typeof schema>;

type VipPackagesType = typeof schema.vipPackages.$inferSelect;
type UserVipSubscriptionsType = typeof schema.userVipSubscriptions.$inferSelect;

export interface CreateVipPackageDto {
  name: string;
  priceCoin: number;
  durationDays: number;
  benefits: {
    nameColor?: string;
    avatarBorder?: string;
    discountPercent?: number;
    maxListings?: number;
    badge?: string;
  }[];
  isActive?: boolean;
}

export interface UpdateVipPackageDto {
  name?: string;
  priceCoin?: number;
  durationDays?: number;
  benefits?: {
    nameColor?: string;
    avatarBorder?: string;
    discountPercent?: number;
    maxListings?: number;
    badge?: string;
  }[];
  isActive?: boolean;
}

export interface PurchaseVipDto {
  packageId: number;
}

export interface VipPackageWithDiscount extends VipPackagesType {
  discountPercent: number;
}

@Injectable()
export class VipService {
  constructor(
    @Inject(DRIZZLE) private db: Db,
    private walletService: WalletService,
    private notificationsService: NotificationsService,
  ) {}

  // ========== Admin: Package Management ==========

  async createPackage(dto: CreateVipPackageDto): Promise<VipPackagesType> {
    const [pkg] = await this.db.insert(schema.vipPackages).values({
      name: dto.name,
      priceCoin: dto.priceCoin.toString(),
      durationDays: dto.durationDays,
      benefits: dto.benefits as any,
      isActive: dto.isActive ?? true,
    }).returning();
    if (!pkg) {
      throw new Error('Failed to create package');
    }
    return pkg;
  }

  async updatePackage(id: number, dto: UpdateVipPackageDto): Promise<VipPackagesType> {
    const existing = await this.db.query.vipPackages.findFirst({
      where: eq(schema.vipPackages.id, id),
    });
    if (!existing) {
      throw new NotFoundException('VIP package not found');
    }

    const [updated] = await this.db.update(schema.vipPackages)
      .set({
        ...(dto.name && { name: dto.name }),
        ...(dto.priceCoin && { priceCoin: dto.priceCoin.toString() }),
        ...(dto.durationDays && { durationDays: dto.durationDays }),
        ...(dto.benefits && { benefits: dto.benefits as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      })
      .where(eq(schema.vipPackages.id, id))
      .returning();
    if (!updated) {
      throw new Error('Failed to update package');
    }
    return updated;
  }

  async deletePackage(id: number): Promise<void> {
    await this.db.delete(schema.vipPackages).where(eq(schema.vipPackages.id, id));
  }

  async getPackages(activeOnly = true): Promise<VipPackageWithDiscount[]> {
    const packages = await this.db.query.vipPackages.findMany({
      where: activeOnly ? eq(schema.vipPackages.isActive, true) : undefined,
      orderBy: [desc(schema.vipPackages.priceCoin)],
    });

    // Get user's current VIP to calculate discount
    return packages.map(pkg => ({
      ...pkg,
      discountPercent: (pkg.benefits as any)?.discountPercent ?? 0,
    }));
  }

  async getPackageById(id: number): Promise<VipPackagesType | undefined> {
    return this.db.query.vipPackages.findFirst({
      where: eq(schema.vipPackages.id, id),
    });
  }

  // ========== User: VIP Subscription ==========

  async getUserVip(userId: number): Promise<UserVipSubscriptionsType | undefined> {
    return this.db.query.userVipSubscriptions.findFirst({
      where: and(
        eq(schema.userVipSubscriptions.userId, userId),
        eq(schema.userVipSubscriptions.isActive, true),
        sql`${schema.userVipSubscriptions.expiresAt} > NOW()`,
      ),
      orderBy: [desc(schema.userVipSubscriptions.expiresAt)],
    });
  }

  async isVip(userId: number): Promise<boolean> {
    const vip = await this.getUserVip(userId);
    return !!vip;
  }

  async purchaseVip(userId: number, dto: PurchaseVipDto): Promise<UserVipSubscriptionsType> {
    const pkg = await this.getPackageById(dto.packageId);
    if (!pkg || !pkg.isActive) {
      throw new BadRequestException('VIP package not found or inactive');
    }

    // Check if user already has VIP - extend instead
    const existingVip = await this.getUserVip(userId);
    const now = new Date();
    let expiresAt: Date;

    if (existingVip) {
      // Extend from current expiry or now
      expiresAt = new Date(existingVip.expiresAt);
      if (expiresAt <= now) {
        expiresAt = new Date(now.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
      } else {
        expiresAt = new Date(expiresAt.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
      }
    } else {
      expiresAt = new Date(now.getTime() + pkg.durationDays * 24 * 60 * 60 * 1000);
    }

    // Calculate price with discount if user has existing VIP
    let price = parseFloat(pkg.priceCoin);
    if (existingVip) {
      const currentPkg = await this.getPackageById(existingVip.packageId);
      const discount = (currentPkg?.benefits as any)?.discountPercent ?? 0;
      price = price * (1 - discount / 100);
    }

    // Deduct from wallet
    const balance = await this.walletService.getBalance(userId);
    if (balance < price) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create subscription
    const [subscription] = await this.db.transaction(async (tx) => {
      await this.walletService.debit(tx, {
        userId,
        amount: price,
        type: 'VIP_PURCHASE',
        referenceType: 'vip_package',
        referenceId: dto.packageId,
        note: `Purchase VIP: ${pkg.name}`,
      });

      return tx.insert(schema.userVipSubscriptions).values({
        userId,
        packageId: dto.packageId,
        startedAt: now,
        expiresAt,
        isActive: true,
      }).returning();
    });

    if (!subscription) {
      throw new Error('Failed to create subscription');
    }

    // Send notification
    await this.notificationsService.create({
      userId,
      type: 'VIP_PURCHASED',
      title: 'Mua VIP thành công',
      content: `Bạn đã mua gói VIP ${pkg.name} thành công. VIP sẽ hết hạn vào ${expiresAt.toLocaleDateString('vi-VN')}`,
    });

    return subscription;
  }

  // ========== VIP Expiry ==========

  async expireVip(subscriptionId: number): Promise<void> {
    const [updated] = await this.db.update(schema.userVipSubscriptions)
      .set({ isActive: false })
      .where(eq(schema.userVipSubscriptions.id, subscriptionId))
      .returning();

    if (updated) {
      await this.notificationsService.create({
        userId: updated.userId,
        type: 'VIP_EXPIRED',
        title: 'VIP đã hết hạn',
        content: 'Gói VIP của bạn đã hết hạn. Hãy gia hạn để tiếp tục hưởng các đặc quyền!',
      });
    }
  }

  async getExpiredSubscriptions(): Promise<UserVipSubscriptionsType[]> {
    return this.db.query.userVipSubscriptions.findMany({
      where: and(
        eq(schema.userVipSubscriptions.isActive, true),
        sql`${schema.userVipSubscriptions.expiresAt} <= NOW()`,
      ),
    });
  }

  // ========== Benefits ==========

  async getUserBenefits(userId: number): Promise<{
    isVip: boolean;
    nameColor?: string;
    avatarBorder?: string;
    discountPercent: number;
    badge?: string;
    maxListings?: number;
  }> {
    const vip = await this.getUserVip(userId);
    if (!vip) {
      return { isVip: false, discountPercent: 0 };
    }

    const pkg = await this.getPackageById(vip.packageId);
    const benefits = (pkg?.benefits as any) || {};

    return {
      isVip: true,
      nameColor: benefits.nameColor,
      avatarBorder: benefits.avatarBorder,
      discountPercent: benefits.discountPercent ?? 0,
      badge: benefits.badge,
      maxListings: benefits.maxListings,
    };
  }
}
