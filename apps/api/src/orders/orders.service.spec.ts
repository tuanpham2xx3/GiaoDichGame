import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService, ORDER_STATUS } from './orders.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EncryptionService } from '../common/encryption.service';
import { InjectQueue } from '@nestjs/bullmq';
import { orders, listings, orderDeliveries, orderTimeline } from '../database/schema';

// ─── Mock Helpers ───────────────────────────────────────────────────────────────

type MockTransactionFn = jest.Mock;

type MockDb = {
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  values: jest.Mock;
  returning: jest.Mock;
  limit: jest.Mock;
  transaction: jest.Mock;
  query: {
    orders: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    listings: {
      findFirst: jest.Mock;
    };
  };
};

function createMockDb() {
  const insertChain = {
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
  };

  const updateChain = {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
    returning: jest.fn().mockResolvedValue([]),
  };

  const db: MockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnValue(insertChain),
    update: jest.fn().mockReturnValue(updateChain),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    limit: jest.fn().mockResolvedValue([]),
    transaction: jest.fn((fn: MockTransactionFn) => fn(db)),
    query: {
      orders: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      listings: {
        findFirst: jest.fn(),
      },
    },
  };

  return db;
}

function createMockWalletService() {
  return {
    checkInsuranceLimit: jest.fn().mockResolvedValue(true),
    holdCoins: jest.fn().mockResolvedValue({ id: 1 }),
    settleToSeller: jest.fn().mockResolvedValue({ id: 2 }),
  };
}

function createMockNotificationsService() {
  return {
    create: jest.fn().mockResolvedValue({ id: 1 }),
  };
}

function createMockEncryptionService() {
  return {
    encryptGameInfo: jest.fn().mockReturnValue('encrypted:data:key'),
    decryptGameInfo: jest.fn().mockReturnValue({ username: 'test', password: 'test123' }),
  };
}

function createMockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;
  let mockDb: MockDb;
  let walletService: any;
  let notificationsService: any;
  let encryptionService: any;
  let ordersQueue: any;

  beforeEach(async () => {
    mockDb = createMockDb();
    walletService = createMockWalletService();
    notificationsService = createMockNotificationsService();
    encryptionService = createMockEncryptionService();
    ordersQueue = createMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: WalletService, useValue: walletService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: EncryptionService, useValue: encryptionService },
        { provide: 'BULLMQ_ORDERS_QUEUE', useValue: ordersQueue },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── ORD-001: Create Order - Success ─────────────────────────────────────────

  describe('createOrder()', () => {
    const mockListing = {
      id: 1,
      sellerId: 2,
      price: '1000',
      status: 'PUBLISHED',
      title: 'Test Listing',
    };

    const mockOrder = {
      id: 1,
      listingId: 1,
      buyerId: 3,
      sellerId: 2,
      amount: '1000',
      status: ORDER_STATUS.LOCKED,
      createdAt: new Date(),
      deliveredAt: null,
      completedAt: null,
    };

    it('ORD-001: should create order successfully when listing is available', async () => {
      // Arrange
      mockDb.query.listings.findFirst.mockResolvedValue(mockListing);
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);
      mockDb.query.orders.findMany.mockResolvedValue([mockOrder]);

      const dto = { listingId: 1 };
      const buyerId = 3;

      // Act
      const result = await service.createOrder(dto, buyerId);

      // Assert
      expect(walletService.holdCoins).toHaveBeenCalled();
      expect(ordersQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        { orderId: 1 },
        expect.objectContaining({
          delay: 72 * 60 * 60 * 1000,
          attempts: 3,
        }),
      );
      expect(notificationsService.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    // ── ORD-002: Listing Not Found ────────────────────────────────────────────

    it('ORD-002: should throw NotFoundException when listing does not exist', async () => {
      // Arrange
      mockDb.query.listings.findFirst.mockResolvedValue(null);

      const dto = { listingId: 999 };
      const buyerId = 3;

      // Act & Assert
      await expect(service.createOrder(dto, buyerId)).rejects.toThrow(NotFoundException);
      await expect(service.createOrder(dto, buyerId)).rejects.toThrow('Listing not found');
    });

    // ── ORD-003: Listing Not Available ─────────────────────────────────────────

    it('ORD-003: should throw BadRequestException when listing is not PUBLISHED', async () => {
      // Arrange
      mockDb.query.listings.findFirst.mockResolvedValue({
        ...mockListing,
        status: 'LOCKED',
      });

      const dto = { listingId: 1 };
      const buyerId = 3;

      // Act & Assert
      await expect(service.createOrder(dto, buyerId)).rejects.toThrow(BadRequestException);
      await expect(service.createOrder(dto, buyerId)).rejects.toThrow('Listing is not available');
    });

    // ── ORD-004: Buy Own Listing ───────────────────────────────────────────────

    it('ORD-004: should throw ForbiddenException when buyer is the seller', async () => {
      // Arrange
      mockDb.query.listings.findFirst.mockResolvedValue({
        ...mockListing,
        sellerId: 3, // Same as buyerId
      });

      const dto = { listingId: 1 };
      const buyerId = 3;

      // Act & Assert
      await expect(service.createOrder(dto, buyerId)).rejects.toThrow(ForbiddenException);
      await expect(service.createOrder(dto, buyerId)).rejects.toThrow('You cannot buy your own listing');
    });

    // ── ORD-005: Insufficient Balance ─────────────────────────────────────────

    it('ORD-005: should throw BadRequestException when buyer has insufficient balance', async () => {
      // Arrange
      mockDb.query.listings.findFirst.mockResolvedValue(mockListing);
      walletService.checkInsuranceLimit.mockResolvedValue(true);
      walletService.holdCoins.mockRejectedValue(
        new BadRequestException('Insufficient balance'),
      );

      const dto = { listingId: 1 };
      const buyerId = 3;

      // Act & Assert
      await expect(service.createOrder(dto, buyerId)).rejects.toThrow('Insufficient balance');
    });

    // ── ORD-006: Insurance Limit Exceeded ─────────────────────────────────────

    it('ORD-006: should throw BadRequestException when seller exceeds insurance limit', async () => {
      // Arrange
      mockDb.query.listings.findFirst.mockResolvedValue(mockListing);
      walletService.checkInsuranceLimit.mockResolvedValue(false);

      const dto = { listingId: 1 };
      const buyerId = 3;

      // Act & Assert
      await expect(service.createOrder(dto, buyerId)).rejects.toThrow(BadRequestException);
      await expect(service.createOrder(dto, buyerId)).rejects.toThrow('Seller has exceeded insurance fund limit');
    });
  });

  // ── ORD-009 to ORD-013: Deliver Order Tests ─────────────────────────────────

  describe('deliverOrder()', () => {
    const mockOrder = {
      id: 1,
      listingId: 1,
      buyerId: 3,
      sellerId: 2,
      amount: '1000',
      status: ORDER_STATUS.LOCKED,
      sellerIdNumber: 2,
    };

    it('ORD-009: should deliver order successfully when status is LOCKED', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);
      mockDb.query.orders.findFirst.mockResolvedValueOnce(mockOrder);
      mockDb.query.orders.findFirst.mockResolvedValueOnce({
        ...mockOrder,
        status: ORDER_STATUS.DELIVERED,
        delivery: { encryptedData: 'encrypted:data:key' },
      });

      const dto = { username: 'gameuser', password: 'gamepass' };
      const sellerId = 2;

      // Act
      const result = await service.deliverOrder(1, dto, sellerId);

      // Assert
      expect(encryptionService.encryptGameInfo).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('ORD-010: should throw NotFoundException when order does not exist', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(null);

      const dto = { username: 'gameuser', password: 'gamepass' };
      const sellerId = 2;

      // Act & Assert
      await expect(service.deliverOrder(999, dto, sellerId)).rejects.toThrow(NotFoundException);
    });

    it('ORD-011: should throw ForbiddenException when user is not the seller', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);

      const dto = { username: 'gameuser', password: 'gamepass' };
      const sellerId = 999; // Not the seller

      // Act & Assert
      await expect(service.deliverOrder(1, dto, sellerId)).rejects.toThrow(ForbiddenException);
      await expect(service.deliverOrder(1, dto, sellerId)).rejects.toThrow('Only the seller can deliver');
    });

    it('ORD-012: should throw BadRequestException when order is not in LOCKED status', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue({
        ...mockOrder,
        status: ORDER_STATUS.DELIVERED,
      });

      const dto = { username: 'gameuser', password: 'gamepass' };
      const sellerId = 2;

      // Act & Assert
      await expect(service.deliverOrder(1, dto, sellerId)).rejects.toThrow(BadRequestException);
      await expect(service.deliverOrder(1, dto, sellerId)).rejects.toThrow('Order is not in LOCKED status');
    });
  });

  // ── ORD-014 to ORD-017: Confirm Receipt Tests ───────────────────────────────

  describe('confirmReceipt()', () => {
    const mockOrder = {
      id: 1,
      listingId: 1,
      buyerId: 3,
      sellerId: 2,
      amount: '1000',
      status: ORDER_STATUS.DELIVERED,
    };

    it('ORD-014: should confirm receipt successfully when status is DELIVERED', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);
      mockDb.query.orders.findFirst.mockResolvedValueOnce(mockOrder);
      mockDb.query.orders.findFirst.mockResolvedValueOnce({
        ...mockOrder,
        status: ORDER_STATUS.COMPLETED,
      });

      const buyerId = 3;

      // Act
      const result = await service.confirmReceipt(1, buyerId);

      // Assert
      expect(walletService.settleToSeller).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('ORD-015: should throw NotFoundException when order does not exist', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(null);

      const buyerId = 3;

      // Act & Assert
      await expect(service.confirmReceipt(999, buyerId)).rejects.toThrow(NotFoundException);
    });

    it('ORD-016: should throw ForbiddenException when user is not the buyer', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);

      const buyerId = 999; // Not the buyer

      // Act & Assert
      await expect(service.confirmReceipt(1, buyerId)).rejects.toThrow(ForbiddenException);
      await expect(service.confirmReceipt(1, buyerId)).rejects.toThrow('Only the buyer can confirm receipt');
    });

    it('ORD-017: should throw BadRequestException when order is not in DELIVERED status', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue({
        ...mockOrder,
        status: ORDER_STATUS.LOCKED,
      });

      const buyerId = 3;

      // Act & Assert
      await expect(service.confirmReceipt(1, buyerId)).rejects.toThrow(BadRequestException);
      await expect(service.confirmReceipt(1, buyerId)).rejects.toThrow('Order is not in DELIVERED status');
    });
  });

  // ── ORD-018 to ORD-022: Order View Tests ────────────────────────────────────

  describe('getOrders()', () => {
    it('ORD-018: should return list of orders for user', async () => {
      // Arrange
      const mockOrders = [
        { id: 1, buyerId: 3, sellerId: 2, status: ORDER_STATUS.LOCKED },
        { id: 2, buyerId: 3, sellerId: 2, status: ORDER_STATUS.COMPLETED },
      ];
      mockDb.query.orders.findMany.mockResolvedValue(mockOrders);

      const userId = 3;

      // Act
      const result = await service.getOrders(userId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getOrderById()', () => {
    const mockOrder = {
      id: 1,
      listingId: 1,
      buyerId: 3,
      sellerId: 2,
      amount: '1000',
      status: ORDER_STATUS.LOCKED,
    };

    it('ORD-019: should return order detail when user is buyer or seller', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);
      mockDb.select().from.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
        orderBy: jest.fn().mockResolvedValue([]),
      });

      const userId = 3;

      // Act
      const result = await service.getOrderById(1, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('ORD-020: should throw ForbiddenException when user has no access', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);

      const userId = 999; // Not buyer or seller

      // Act & Assert
      await expect(service.getOrderById(1, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getGameInfo()', () => {
    const mockOrderWithDelivery = {
      id: 1,
      buyerId: 3,
      sellerId: 2,
      delivery: { encryptedData: 'encrypted:data:key' },
    };

    const mockOrderWithoutDelivery = {
      id: 1,
      buyerId: 3,
      sellerId: 2,
      delivery: null,
    };

    it('ORD-021: should return decrypted game info when delivery exists', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrderWithDelivery);

      const userId = 3;

      // Act
      const result = await service.getGameInfo(1, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.gameInfo).toBeDefined();
    });

    it('ORD-022: should throw BadRequestException when game info not delivered', async () => {
      // Arrange
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrderWithoutDelivery);

      const userId = 3;

      // Act & Assert
      await expect(service.getGameInfo(1, userId)).rejects.toThrow(BadRequestException);
      await expect(service.getGameInfo(1, userId)).rejects.toThrow('Game info not delivered yet');
    });
  });

  // ── Auto Complete Tests ───────────────────────────────────────────────────

  describe('autoCompleteOrder()', () => {
    it('BULL-001: should auto complete order after 72h when status is DELIVERED', async () => {
      // Arrange
      const mockOrder = {
        id: 1,
        buyerId: 3,
        sellerId: 2,
        amount: '1000',
        status: ORDER_STATUS.DELIVERED,
      };
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);

      // Act
      await service.autoCompleteOrder(1);

      // Assert
      expect(walletService.settleToSeller).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalledTimes(2); // Buyer + Seller
    });

    it('BULL-002: should skip if order is not in DELIVERED status', async () => {
      // Arrange
      const mockOrder = {
        id: 1,
        buyerId: 3,
        sellerId: 2,
        amount: '1000',
        status: ORDER_STATUS.COMPLETED,
      };
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);

      // Act
      await service.autoCompleteOrder(1);

      // Assert
      expect(walletService.settleToSeller).not.toHaveBeenCalled();
    });

    it('BULL-003: should skip if order has dispute', async () => {
      // Arrange
      const mockOrder = {
        id: 1,
        buyerId: 3,
        sellerId: 2,
        amount: '1000',
        status: ORDER_STATUS.DISPUTED,
      };
      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);

      // Act
      await service.autoCompleteOrder(1);

      // Assert
      expect(walletService.settleToSeller).not.toHaveBeenCalled();
    });
  });
});
