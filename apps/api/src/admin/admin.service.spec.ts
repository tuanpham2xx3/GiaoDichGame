import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { DRIZZLE } from '../database/database.module';
import { NotFoundException } from '@nestjs/common';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  email: 'user@example.com',
  username: 'testuser',
  isActive: true,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStats = {
  totalUsers: 100,
  totalOrders: 50,
  totalDisputes: 5,
  totalRevenue: '1000000',
  totalListings: 30,
  activeListings: 25,
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
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  query: {
    users: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    userRoles: {
      findMany: jest.fn(),
    },
    roles: {
      findMany: jest.fn(),
    },
    topupRequests: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service: AdminService;
  let db: typeof mockDb;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    db = module.get(DRIZZLE);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== Stats ==========

  describe('getStats', () => {
    it('ADM-001: should return system stats successfully', async () => {
      (db.select as any).mockReturnValue({
        from: jest.fn().mockResolvedValue([{ count: 100 }]),
      });

      const result = await service.getStats();

      expect(result.totalUsers).toBe(100);
      expect(result.totalOrders).toBe(50);
      expect(result.totalDisputes).toBe(5);
    });

    it('ADM-002: should return 0 when no data', async () => {
      (db.select as any).mockReturnValue({
        from: jest.fn().mockResolvedValue([{ count: 0 }]),
      });

      const result = await service.getStats();

      expect(result.totalUsers).toBe(0);
    });
  });

  // ========== User Management ==========

  describe('getUsers', () => {
    it('ADM-003: should return paginated list of users', async () => {
      db.query.users.findMany = jest.fn().mockResolvedValue([mockUser]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockResolvedValue([{ count: 1 }]),
      });

      const result = await service.getUsers({ page: 1, limit: 20 });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('ADM-004: should search users by email', async () => {
      db.query.users.findMany = jest.fn().mockResolvedValue([mockUser]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockResolvedValue([{ count: 1 }]),
      });

      await service.getUsers({ page: 1, limit: 20, search: 'user@example.com' });

      expect(db.query.users.findMany).toHaveBeenCalled();
    });

    it('ADM-005: should filter users by active status', async () => {
      db.query.users.findMany = jest.fn().mockResolvedValue([mockUser]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockResolvedValue([{ count: 1 }]),
      });

      await service.getUsers({ page: 1, limit: 20, isActive: true });

      expect(db.query.users.findMany).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('ADM-006: should return user by ID', async () => {
      db.query.users.findFirst = jest.fn().mockResolvedValue(mockUser);

      const result = await service.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(result.id).toBe(1);
    });

    it('ADM-007: should throw NotFoundException when user not found', async () => {
      db.query.users.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('banUser', () => {
    it('ADM-008: should ban user successfully', async () => {
      db.query.users.findFirst = jest.fn().mockResolvedValue(mockUser);
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockUser, isActive: false }]),
      });

      const result = await service.banUser(1);

      expect(result.isActive).toBe(false);
      expect(db.update).toHaveBeenCalled();
    });

    it('ADM-009: should throw NotFoundException when user not found', async () => {
      db.query.users.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.banUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('unbanUser', () => {
    it('ADM-010: should unban user successfully', async () => {
      const bannedUser = { ...mockUser, isActive: false };
      db.query.users.findFirst = jest.fn().mockResolvedValue(bannedUser);
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockUser, isActive: true }]),
      });

      const result = await service.unbanUser(1);

      expect(result.isActive).toBe(true);
    });

    it('ADM-011: should throw NotFoundException when user not found', async () => {
      db.query.users.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.unbanUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ========== User Roles ==========

  describe('getUserRoles', () => {
    it('ADM-012: should return user roles', async () => {
      db.query.userRoles.findMany = jest.fn().mockResolvedValue([
        { userId: 1, roleId: 1, role: { id: 1, name: 'USER' } },
      ]);

      const result = await service.getUserRoles(1);

      expect(result).toHaveLength(1);
      expect(result[0].role.name).toBe('USER');
    });
  });

  describe('assignRole', () => {
    it('ADM-013: should assign role to user successfully', async () => {
      db.query.users.findFirst = jest.fn().mockResolvedValue(mockUser);
      (db.insert as any).mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ userId: 1, roleId: 2 }]),
      });

      const result = await service.assignRole(1, 2, 1);

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
    });

    it('ADM-014: should throw NotFoundException when user not found', async () => {
      db.query.users.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.assignRole(999, 2, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeRole', () => {
    it('ADM-015: should remove role from user successfully', async () => {
      (db.delete as any).mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      });

      await service.removeRole(1, 2);

      expect(db.delete).toHaveBeenCalled();
    });
  });

  // ========== Topup Management ==========

  describe('getPendingTopups', () => {
    it('ADM-016: should return pending topup requests', async () => {
      db.query.topupRequests.findMany = jest.fn().mockResolvedValue([
        { id: 1, userId: 1, amountCoin: '100000', status: 'PENDING' },
      ]);

      const result = await service.getPendingTopups();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDING');
    });
  });

  describe('confirmTopup', () => {
    it('ADM-017: should confirm topup request successfully', async () => {
      const mockTopup = { id: 1, userId: 1, amountCoin: '100000', status: 'PENDING' };
      db.query.topupRequests.findFirst = jest.fn().mockResolvedValue(mockTopup);
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockTopup, status: 'SUCCESS' }]),
      });

      const result = await service.confirmTopup(1, 1);

      expect(result.status).toBe('SUCCESS');
    });

    it('ADM-018: should throw NotFoundException when topup not found', async () => {
      db.query.topupRequests.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.confirmTopup(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
