import { Test, TestingModule } from '@nestjs/testing';
import { VipService } from './vip.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DRIZZLE } from '../database/database.module';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QUEUE_NAMES } from '@giaodich/shared';
import { Queue } from 'bullmq';
import { createMockQueue } from '../__mocks__/bullmq';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockVipPackage = {
  id: 1,
  name: 'VIP Vàng',
  priceCoin: '100000',
  durationDays: 30,
  benefits: [
    { nameColor: '#FFD700', discountPercent: 10, badge: 'VIP' },
  ],
  isActive: true,
  createdAt: new Date(),
};

const mockUserVipSubscription = {
  id: 1,
  userId: 1,
  packageId: 1,
  startedAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  isActive: true,
  bullmqJobId: null,
};

const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  query: {
    vipPackages: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    userVipSubscriptions: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
  transaction: jest.fn().mockImplementation(async (fn) => {
    return fn(mockDb);
  }),
};

const mockWalletService = {
  debit: jest.fn().mockResolvedValue({}),
  getBalance: jest.fn(),
};

const mockNotificationsService = {
  createNotification: jest.fn(),
  create: jest.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('VipService', () => {
  let service: VipService;
  let db: typeof mockDb;
  let walletService: WalletService;
  let premiumQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VipService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: QUEUE_NAMES.PREMIUM, useValue: createMockQueue('premium') },
      ],
    }).compile();

    service = module.get<VipService>(VipService);
    db = module.get(DRIZZLE);
    walletService = module.get(WalletService);
    premiumQueue = module.get(QUEUE_NAMES.PREMIUM);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== Admin: Package Management ==========

  describe('createPackage', () => {
    const createDto = {
      name: 'VIP Kim Cương',
      priceCoin: 200000,
      durationDays: 30,
      benefits: [{ nameColor: '#B9F2FF', discountPercent: 20 }],
      isActive: true,
    };

    it('VIP-001: should create VIP package successfully', async () => {
      (db.insert as any).mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockVipPackage]),
      });

      const result = await service.createPackage(createDto);

      expect(result).toEqual(mockVipPackage);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('updatePackage', () => {
    const updateDto = {
      name: 'VIP Vàng Updated',
      priceCoin: 120000,
    };

    it('VIP-002: should update VIP package successfully', async () => {
      db.query.vipPackages.findFirst = jest.fn().mockResolvedValue(mockVipPackage);
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockVipPackage, ...updateDto }]),
      });

      const result = await service.updatePackage(1, updateDto);

      expect(result.name).toBe('VIP Vàng Updated');
    });

    it('VIP-003: should throw NotFoundException when package not found', async () => {
      db.query.vipPackages.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.updatePackage(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePackage', () => {
    it('VIP-004: should delete VIP package successfully', async () => {
      (db.delete as any).mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      });

      await service.deletePackage(1);

      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe('getAllPackages', () => {
    it('VIP-005: should return list of active VIP packages', async () => {
      db.query.vipPackages.findMany = jest.fn().mockResolvedValue([mockVipPackage]);

      const result = await service.getPackages();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('VIP Vàng');
    });
  });

  describe('getPackageById', () => {
    it('VIP-006: should return VIP package by ID', async () => {
      db.query.vipPackages.findFirst = jest.fn().mockResolvedValue(mockVipPackage);

      const result = await service.getPackageById(1);

      expect(result).toEqual(mockVipPackage);
    });

    it('VIP-007: should return undefined when package not found', async () => {
      db.query.vipPackages.findFirst = jest.fn().mockResolvedValue(undefined);

      const result = await service.getPackageById(999);

      expect(result).toBeUndefined();
    });
  });

  // ========== User: Purchase VIP ==========

  describe('purchaseVip', () => {
    const userId = 1;
    const packageId = 1;

    it('VIP-008: should purchase VIP successfully', async () => {
      // Mock package exists
      db.query.vipPackages.findFirst = jest.fn().mockResolvedValue(mockVipPackage);

      // Mock no active subscription
      db.query.userVipSubscriptions.findMany = jest.fn().mockResolvedValue([]);

      // Mock wallet debit success
      (walletService.debit as any).mockResolvedValue({ id: 1 });

      // Mock insert subscription
      (db.insert as any).mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUserVipSubscription]),
      });

      const result = await service.purchaseVip(userId, { packageId });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('VIP-009: should throw BadRequestException when package not active', async () => {
      const inactivePackage = { ...mockVipPackage, isActive: false };
      db.query.vipPackages.findFirst = jest.fn().mockResolvedValue(inactivePackage);

      await expect(service.purchaseVip(userId, { packageId })).rejects.toThrow(BadRequestException);
    });

    it('VIP-010: should extend VIP when user already has active VIP', async () => {
      db.query.vipPackages.findFirst = jest.fn().mockResolvedValue(mockVipPackage);
      db.query.userVipSubscriptions.findMany = jest.fn().mockResolvedValue([mockUserVipSubscription]);
      (walletService.getBalance as any).mockResolvedValue(999999);
      (db.transaction as any).mockImplementation(async (fn) => fn(db));
      (db.insert as any).mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUserVipSubscription]),
      });

      const result = await service.purchaseVip(userId, { packageId });

      expect(result).toBeDefined();
    });

    it('VIP-011: should throw BadRequestException when insufficient balance', async () => {
      db.query.vipPackages.findFirst = jest.fn().mockResolvedValue(mockVipPackage);
      db.query.userVipSubscriptions.findMany = jest.fn().mockResolvedValue([]);
      (walletService.debit as any).mockRejectedValue(new BadRequestException('Insufficient balance'));

      await expect(service.purchaseVip(userId, { packageId })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserVip', () => {
    it('VIP-012: should return user VIP subscription details', async () => {
      db.query.userVipSubscriptions.findFirst = jest.fn().mockResolvedValue(mockUserVipSubscription);

      const result = await service.getUserVip(1);

      expect(result).toEqual(mockUserVipSubscription);
    });

    it('VIP-013: should return undefined when no active subscription', async () => {
      db.query.userVipSubscriptions.findFirst = jest.fn().mockResolvedValue(undefined);

      const result = await service.getUserVip(1);

      expect(result).toBeUndefined();
    });
  });

  describe('getVipBenefits', () => {
    it('VIP-014: should return VIP benefits for active subscription', async () => {
      db.query.userVipSubscriptions.findMany = jest.fn().mockResolvedValue([mockUserVipSubscription]);
      db.query.vipPackages.findFirst = jest.fn().mockResolvedValue(mockVipPackage);

      const result = await service.getUserBenefits(1);

      expect(result).toBeDefined();
      expect(result.discountPercent).toBeDefined();
    });

    it('VIP-015: should return default benefits for non-VIP user', async () => {
      db.query.userVipSubscriptions.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getUserBenefits(1);

      expect(result.discountPercent).toBe(0);
    });
  });

  // ========== VIP Expiry ==========
  // Note: handleExpiry method not yet implemented in service
  // describe('handleVipExpiry', () => {
  //   it('VIP-016: should handle VIP expiry and send notification', async () => {
  //     const subscriptionId = 1;
  //     const userId = 1;

  //     db.query.userVipSubscriptions.findFirst = jest.fn().mockResolvedValue({
  //       ...mockUserVipSubscription,
  //       id: subscriptionId,
  //       userId,
  //     });

  //     (db.update as any).mockReturnValue({
  //       set: jest.fn().mockReturnThis(),
  //       where: jest.fn().mockReturnThis(),
  //       returning: jest.fn().mockResolvedValue([{}]),
  //     });

  //     await service.handleExpiry(subscriptionId);

  //     expect(db.update).toHaveBeenCalled();
  //     expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
  //       userId,
  //       'VIP_EXPIRED',
  //       expect.any(String),
  //       expect.anything(),
  //     );
  //   });
  // });
});
