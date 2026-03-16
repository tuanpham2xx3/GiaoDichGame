import { Test, TestingModule } from '@nestjs/testing';
import { DisputesService } from './disputes.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DRIZZLE } from '../database/database.module';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { createMockQueue } from '../__mocks__/bullmq';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockOrder = {
  id: 1,
  listingId: 1,
  buyerId: 1,
  sellerId: 2,
  amount: '100000',
  status: 'DELIVERED',
  deliveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  createdAt: new Date(),
};

const mockDisputeTicket = {
  id: 1,
  orderId: 1,
  buyerId: 1,
  sellerId: 2,
  reason: 'Account not as described',
  status: 'OPEN',
  sellerDeadline: new Date(Date.now() + 6 * 60 * 60 * 1000),
  resolution: null,
  resolutionNote: null,
  createdAt: new Date(),
  resolvedAt: null,
};

const mockDisputeMessage = {
  id: 1,
  ticketId: 1,
  senderId: 1,
  message: 'Test message',
  attachmentUrls: null,
  createdAt: new Date(),
};

// Helper to create chainable mock
const createChainableMock = () => {
  const mock: any = {
    insert: jest.fn(),
    values: jest.fn(),
    onConflictDoUpdate: jest.fn(),
    returning: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    where: jest.fn(),
    delete: jest.fn(),
    select: jest.fn(),
    from: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    $dynamic: jest.fn(),
    transaction: jest.fn(),
    query: {
      orders: { findFirst: jest.fn(), findMany: jest.fn() },
      disputeTickets: { findFirst: jest.fn(), findMany: jest.fn() },
      disputeMessages: { findFirst: jest.fn(), findMany: jest.fn() },
      disputeEvidence: { findFirst: jest.fn(), findMany: jest.fn() },
      users: { findFirst: jest.fn(), findMany: jest.fn() },
      disputeSettings: { findFirst: jest.fn(), findMany: jest.fn() },
    },
  };

  const chainableMethods = ['insert', 'values', 'update', 'set', 'where', 'delete', 'select', 'from', 'orderBy', 'limit', 'offset', 'innerJoin', 'leftJoin', '$dynamic', 'onConflictDoUpdate'];
  chainableMethods.forEach(method => {
    mock[method].mockImplementation(() => mock);
  });

  return mock;
};

const mockWalletService = {
  release: jest.fn(),
  settle: jest.fn(),
  refundToBuyer: jest.fn(),
  settleToSeller: jest.fn(),
};

const mockNotificationsService = {
  createNotification: jest.fn().mockResolvedValue(undefined),
  create: jest.fn().mockResolvedValue(undefined),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DisputesService', () => {
  let service: DisputesService;
  let db: ReturnType<typeof createChainableMock>;
  let walletService: typeof mockWalletService;

  beforeEach(async () => {
    db = createChainableMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: DRIZZLE, useValue: db },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: 'BullQueue_disputes', useValue: createMockQueue('disputes') },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    db = module.get(DRIZZLE);
    walletService = module.get(WalletService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== Create Dispute ==========

  describe('createDispute', () => {
    const createDto = {
      orderId: '1',
      reason: 'ACCOUNT_NOT_AS_DESCRIBED',
      description: 'The account credentials are incorrect',
    };

    it('DSP-001: should create dispute successfully', async () => {
      db.query.orders.findFirst.mockResolvedValue(mockOrder);
      db.query.disputeTickets.findFirst.mockResolvedValueOnce(null); // First call for existing check
      db.query.disputeSettings.findFirst.mockResolvedValue({ key: 'auto_refund_hours', value: '6' });
      db.insert.mockImplementation(() => ({
        values: jest.fn().mockImplementation(() => ({
          returning: jest.fn().mockResolvedValue([mockDisputeTicket]),
        })),
      }));
      db.query.users.findFirst.mockResolvedValue({ id: 1, userRoles: [] });
      db.select.mockImplementation(() => ({
        from: jest.fn().mockImplementation(() => ({
          innerJoin: jest.fn().mockImplementation(() => ({
            where: jest.fn().mockImplementation(() => ({
              limit: jest.fn().mockResolvedValue([]),
            })),
          })),
        })),
      }));
      db.query.disputeTickets.findFirst.mockResolvedValueOnce(mockDisputeTicket); // Second call for getDisputeById

      const result = await service.createDispute(createDto, 1);

      expect(result).toBeDefined();
      expect(result.orderId).toBe(1);
    });

    it('DSP-002: should throw NotFoundException when order not found', async () => {
      db.query.orders.findFirst.mockResolvedValue(null);
      await expect(service.createDispute(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('DSP-003: should throw ForbiddenException when not buyer', async () => {
      db.query.orders.findFirst.mockResolvedValue({ ...mockOrder, buyerId: 999 });
      await expect(service.createDispute(createDto, 1)).rejects.toThrow(ForbiddenException);
    });

    it('DSP-004: should throw BadRequestException when order not DELIVERED', async () => {
      db.query.orders.findFirst.mockResolvedValue({ ...mockOrder, status: 'LOCKED' });
      await expect(service.createDispute(createDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('DSP-005: should throw BadRequestException when dispute window expired', async () => {
      const oldOrder = { ...mockOrder, deliveredAt: new Date(Date.now() - 80 * 60 * 60 * 1000) };
      db.query.orders.findFirst.mockResolvedValue(oldOrder);
      await expect(service.createDispute(createDto, 1)).rejects.toThrow(BadRequestException);
    });

    it('DSP-006: should throw BadRequestException when dispute already exists', async () => {
      db.query.orders.findFirst.mockResolvedValue(mockOrder);
      db.query.disputeTickets.findFirst.mockResolvedValue(mockDisputeTicket);
      await expect(service.createDispute(createDto, 1)).rejects.toThrow(BadRequestException);
    });
  });

  // ========== Get Disputes ==========

  describe('getDisputes', () => {
    it('DSP-007: should return list of disputes for user', async () => {
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          $dynamic: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue([mockDisputeTicket]),
            }),
          }),
        }),
      });

      const result = await service.getDisputes(1);

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe(1);
    });
  });

  describe('getDisputeById', () => {
    it('DSP-008: should return dispute details', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(mockDisputeTicket);
      db.query.users.findFirst.mockResolvedValue({ id: 1, userRoles: [] });
      db.query.orders.findFirst.mockResolvedValue(mockOrder);

      const result = await service.getDisputeById(1, 1);

      expect(result.id).toBe(mockDisputeTicket.id);
      expect(result.orderId).toBe(1);
    });

    it('DSP-009: should throw NotFoundException when dispute not found', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(null);
      await expect(service.getDisputeById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('DSP-010: should throw ForbiddenException when user has no access', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue({
        ...mockDisputeTicket,
        buyerId: 999,
        sellerId: 888,
      });
      db.query.users.findFirst.mockResolvedValue({ id: 1, userRoles: [] });
      await expect(service.getDisputeById(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  // ========== Send Message ==========

  describe('sendMessage', () => {
    const messageDto = {
      message: 'This is a test message',
      attachmentUrls: ['https://example.com/evidence.png'],
    };

    it('DSP-011: should send message successfully', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(mockDisputeTicket);
      db.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ ...mockDisputeMessage, message: 'This is a test message' }]),
        }),
      });
      db.query.users.findFirst.mockResolvedValue({ id: 1, userRoles: [] });

      const result = await service.sendMessage(1, messageDto, 1);

      expect(result).toBeDefined();
      expect(result.message).toBe('This is a test message');
    });

    it('DSP-012: should throw NotFoundException when dispute not found', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(null);
      await expect(service.sendMessage(999, messageDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('DSP-013: should throw ForbiddenException when user not involved', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue({
        ...mockDisputeTicket,
        buyerId: 999,
        sellerId: 888,
      });
      await expect(service.sendMessage(1, messageDto, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  // ========== Withdraw Dispute ==========

  describe('withdrawDispute', () => {
    it('DSP-014: should withdraw dispute successfully', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(mockDisputeTicket);
      db.query.users.findFirst.mockResolvedValue({ id: 1, userRoles: [] });

      const result = await service.withdrawDispute(1, 1);

      expect(result.success).toBe(true);
    });

    it('DSP-015: should throw NotFoundException when dispute not found', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(null);
      await expect(service.withdrawDispute(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('DSP-016: should throw ForbiddenException when not buyer', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue({
        ...mockDisputeTicket,
        buyerId: 999,
      });
      await expect(service.withdrawDispute(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  // ========== Admin: Resolve Dispute ==========

  describe('resolveDispute', () => {
    const judgeDto = {
      resolution: 'REFUND',
      resolutionNote: 'Seller did not provide valid evidence',
    };

    it('DSP-017: should resolve dispute with REFUND', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(mockDisputeTicket);
      db.query.orders.findFirst.mockResolvedValue(mockOrder);
      walletService.refundToBuyer.mockResolvedValue({});
      db.query.users.findFirst.mockResolvedValue({ id: 1, userRoles: [] });

      const result = await service.resolveDispute(1, judgeDto, 1);

      expect(result.id).toBe(mockDisputeTicket.id);
    });

    it('DSP-018: should resolve dispute with RELEASE', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(mockDisputeTicket);
      db.query.orders.findFirst.mockResolvedValue(mockOrder);
      walletService.settleToSeller.mockResolvedValue({});
      db.query.users.findFirst.mockResolvedValue({ id: 1, userRoles: [] });

      const result = await service.resolveDispute(1, { ...judgeDto, resolution: 'RELEASE' }, 1);

      expect(result.id).toBe(mockDisputeTicket.id);
    });

    it('DSP-019: should throw NotFoundException when dispute not found', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(null);
      await expect(service.resolveDispute(999, judgeDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // ========== Auto Refund ==========

  describe('handleAutoRefund', () => {
    it('DSP-020: should auto refund when seller did not respond', async () => {
      const ticket = {
        ...mockDisputeTicket,
        id: 1,
        orderId: 1,
        buyerId: 1,
        sellerId: 2,
      };
      db.query.disputeTickets.findFirst.mockResolvedValue(ticket);
      db.query.disputeMessages.findMany.mockResolvedValue([]);

      const result = await service.handleAutoRefund(1);

      expect(result.success).toBe(true);
      expect(result.refunded).toBe(true);
    });

    it('DSP-021: should skip auto refund if seller responded', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(mockDisputeTicket);
      db.query.disputeMessages.findMany.mockResolvedValue([{ id: 1, message: 'test' }]);

      const result = await service.handleAutoRefund(1);

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('Seller responded');
    });
  });

  // ========== Settings ==========

  describe('getSettings', () => {
    it('DSP-022: should return dispute settings', async () => {
      db.query.disputeSettings.findFirst.mockResolvedValue({
        key: 'auto_refund_hours',
        value: '6',
      });

      const result = await service.getSettings();

      expect(result.auto_refund_hours).toBe('6');
    });
  });

  describe('updateSettings', () => {
    it('DSP-023: should update dispute settings', async () => {
      db.query.disputeSettings.findFirst.mockResolvedValue({
        key: 'auto_refund_hours',
        value: '6',
      });

      const result = await service.updateSettings('auto_refund_hours', '12', 1);

      expect(result.success).toBe(true);
    });
  });

  // ========== Evidence ==========

  describe('uploadEvidence', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'evidence.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('test'),
    } as any;

    it('DSP-024: should upload evidence successfully', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(mockDisputeTicket);
      db.select.mockImplementation(() => ({
        from: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockImplementation(() => ({
            orderBy: jest.fn().mockImplementation(() => ({
              limit: jest.fn().mockResolvedValue([]),
            })),
          })),
        })),
      }));
      db.insert.mockImplementation(() => ({
        values: jest.fn().mockImplementation(() => ({
          returning: jest.fn().mockResolvedValue([{ id: 1, fileName: 'evidence.png' }]),
        })),
      }));
      db.query.users.findFirst.mockResolvedValue({ id: 2, userRoles: [] });

      const result = await service.uploadEvidence(1, mockFile, 2);

      expect(result).toBeDefined();
      expect(result.fileName).toBe('evidence.png');
    });

    it('DSP-025: should throw BadRequestException when max files reached', async () => {
      db.query.disputeTickets.findFirst.mockResolvedValue(mockDisputeTicket);
      const manyFiles = Array(10).fill({ id: 1 });
      db.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(manyFiles),
        }),
      });

      await expect(service.uploadEvidence(1, mockFile, 2)).rejects.toThrow(BadRequestException);
    });
  });
});
