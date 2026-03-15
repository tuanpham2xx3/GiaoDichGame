import { Test, TestingModule } from '@nestjs/testing';
import { PinService } from './pin.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ListingsService } from '../listings/listings.service';
import { DRIZZLE } from '../database/database.module';
import { Queue } from 'bullmq';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockQueue } from '../__mocks__/bullmq';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPinConfig = {
  id: 1,
  pricePerDay: '5000',
  maxActivePins: 3,
  updatedAt: new Date(),
  updatedBy: null,
};

const mockListing = {
  id: 1,
  sellerId: 1,
  gameId: 1,
  title: 'Test Listing',
  price: '100000',
  isPinned: false,
  status: 'PUBLISHED',
};

const mockListingPin = {
  id: 1,
  listingId: 1,
  userId: 1,
  days: 7,
  pricePaid: '35000',
  startsAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
    pinConfig: {
      findMany: jest.fn(),
    },
    listings: {
      findFirst: jest.fn(),
    },
    listingPins: {
      findMany: jest.fn(),
    },
  },
  transaction: jest.fn().mockImplementation(async (fn) => {
    return fn(mockDb);
  }),
};

const mockWalletService = {
  debit: jest.fn(),
  getBalance: jest.fn(),
};

const mockNotificationsService = {
  createNotification: jest.fn().mockResolvedValue(undefined),
};

const mockListingsService = {
  getListingById: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PinService', () => {
  let service: PinService;
  let db: typeof mockDb;
  let walletService: WalletService;
  let premiumQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ListingsService, useValue: mockListingsService },
        { provide: 'BullQueue_premium', useValue: createMockQueue('premium') },
      ],
    }).compile();

    service = module.get<PinService>(PinService);
    db = module.get(DRIZZLE);
    walletService = module.get(WalletService);
    premiumQueue = module.get('BullQueue_premium');

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== Admin: Pin Config ==========

  describe('getConfig', () => {
    it('PIN-001: should return pin config successfully', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([mockPinConfig]);

      const result = await service.getConfig();

      expect(result).toEqual(mockPinConfig);
    });

    it('PIN-002: should return undefined when no config exists', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getConfig();

      expect(result).toBeUndefined();
    });
  });

  describe('updateConfig', () => {
    const updateDto = {
      pricePerDay: 10000,
      maxActivePins: 5,
    };

    it('PIN-003: should update pin config successfully', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([mockPinConfig]);
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockPinConfig, pricePerDay: '10000', maxActivePins: 5 }]),
      });

      const result = await service.updateConfig(updateDto);

      expect(result.pricePerDay).toEqual('10000');
      expect(result.maxActivePins).toBe(5);
    });

    it('PIN-004: should create config if not exists', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([]);
      (db.insert as any).mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockPinConfig]),
      });

      const result = await service.updateConfig(updateDto);

      expect(result).toEqual(mockPinConfig);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  // ========== User: Purchase Pin ==========

  describe('calculatePrice', () => {
    it('PIN-005: should calculate price correctly', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([mockPinConfig]);
      db.query.userVipSubscriptions.findFirst = jest.fn().mockResolvedValue(null);

      const result = await service.calculatePrice(1, 7, 0);

      expect(result.pricePerDay).toBe(5000);
      expect(result.days).toBe(7);
      expect(result.originalPrice).toBe(35000);
      expect(result.discount).toBe(0);
      expect(result.finalPrice).toBe(35000);
    });

    it('PIN-006: should calculate price with VIP discount', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([mockPinConfig]);

      const result = await service.calculatePrice(1, 7, 10); // 10% VIP discount

      expect(result.originalPrice).toBe(35000);
      expect(result.discount).toBe(10);
      expect(result.finalPrice).toBe(31500);
    });
  });

  describe('purchasePin', () => {
    const userId = 1;
    const purchaseDto = {
      listingId: 1,
      days: 7,
    };

    it('PIN-007: should purchase pin successfully', async () => {
      // Mock config exists
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([mockPinConfig]);

      // Mock listing exists and belongs to user
      db.query.listings.findFirst = jest.fn().mockResolvedValue(mockListing);

      // Mock no active pins
      db.query.listingPins.findMany = jest.fn().mockResolvedValue([]);

      // Mock wallet debit success
      (walletService.debit as any).mockResolvedValue({ id: 1 });

      // Mock insert pin
      (db.insert as any).mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockListingPin]),
      });

      // Mock update listing
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{}]),
      });

      const result = await service.purchasePin(userId, purchaseDto);

      expect(result).toBeDefined();
      expect(result.listingId).toBe(1);
      expect(result.days).toBe(7);
      expect(walletService.debit).toHaveBeenCalledWith(
        userId,
        35000,
        'PIN_PURCHASE',
        expect.anything(),
      );
    });

    it('PIN-008: should throw NotFoundException when listing not found', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([mockPinConfig]);
      db.query.listings.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.purchasePin(userId, purchaseDto)).rejects.toThrow(NotFoundException);
    });

    it('PIN-009: should throw BadRequestException when listing not owned by user', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([mockPinConfig]);
      db.query.listings.findFirst = jest.fn().mockResolvedValue({ ...mockListing, sellerId: 999 });

      await expect(service.purchasePin(userId, purchaseDto)).rejects.toThrow(BadRequestException);
    });

    it('PIN-010: should throw BadRequestException when listing already pinned', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([mockPinConfig]);
      db.query.listings.findFirst = jest.fn().mockResolvedValue(mockListing);
      db.query.listingPins.findMany = jest.fn().mockResolvedValue([mockListingPin]);

      await expect(service.purchasePin(userId, purchaseDto)).rejects.toThrow(BadRequestException);
    });

    it('PIN-011: should throw BadRequestException when insufficient balance', async () => {
      db.query.pinConfig.findMany = jest.fn().mockResolvedValue([mockPinConfig]);
      db.query.listings.findFirst = jest.fn().mockResolvedValue(mockListing);
      db.query.listingPins.findMany = jest.fn().mockResolvedValue([]);
      (walletService.debit as any).mockRejectedValue(new BadRequestException('Insufficient balance'));

      await expect(service.purchasePin(userId, purchaseDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyPins', () => {
    it('PIN-012: should return user active pins', async () => {
      db.query.listingPins.findMany = jest.fn().mockResolvedValue([mockListingPin]);

      const result = await service.getMyPins(1);

      expect(result).toHaveLength(1);
      expect(result[0].listingId).toBe(1);
    });
  });

  // ========== Pin Expiry ==========

  describe('handlePinExpiry', () => {
    it('PIN-013: should handle pin expiry and send notification', async () => {
      const pinId = 1;
      const listingId = 1;

      db.query.listingPins.findFirst = jest.fn().mockResolvedValue({
        ...mockListingPin,
        id: pinId,
        listingId,
      });

      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{}]),
      });

      await service.handleExpiry(pinId);

      expect(db.update).toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        1,
        'PIN_EXPIRED',
        expect.any(String),
        expect.anything(),
      );
    });
  });

  describe('getPinDiscount', () => {
    it('PIN-014: should return 0 discount for non-VIP user', async () => {
      const discount = service.getDiscount(0);
      expect(discount).toBe(0);
    });

    it('PIN-015: should return discount for VIP user', async () => {
      const discount = service.getDiscount(10);
      expect(discount).toBe(10);
    });
  });
});
