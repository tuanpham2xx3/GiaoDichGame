import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { DRIZZLE } from '../database/database.module';
import { NotFoundException } from '@nestjs/common';

// ─── Mock Data ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  email: 'user@example.com',
  username: 'testuser',
  isActive: true,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBannedUser = {
  id: 1,
  email: 'user@example.com',
  username: 'testuser',
  isActive: false,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTopup = {
  id: 1,
  userId: 1,
  amountCoin: '100000',
  status: 'PENDING',
  createdAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: any;

  // Helper to create a proper query builder that supports chaining
  const createQueryBuilder = (returnValue: any) => {
    const builder: any = Promise.resolve(returnValue);
    builder.where = jest.fn().mockReturnValue(Promise.resolve(returnValue));
    builder.orderBy = jest.fn().mockReturnValue(Promise.resolve(returnValue));
    builder.limit = jest.fn().mockReturnValue({
      offset: jest.fn().mockResolvedValue(returnValue),
    });
    builder.innerJoin = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(returnValue),
    });
    return builder;
  };

  const createMockDb = () => ({
    select: jest.fn().mockImplementation(() => {
      return {
        from: jest.fn().mockImplementation(() => createQueryBuilder([{ count: 100 }])),
      };
    }),
    update: jest.fn().mockImplementation(() => ({
      set: jest.fn().mockImplementation(() => ({
        where: jest.fn().mockResolvedValue([{ ...mockUser, isActive: false }]),
      })),
    })),
    insert: jest.fn().mockImplementation(() => ({
      values: jest.fn().mockImplementation(() => ({
        returning: jest.fn().mockResolvedValue([{ userId: 1, roleId: 2 }]),
      })),
    })),
    delete: jest.fn().mockImplementation(() => ({
      where: jest.fn().mockResolvedValue(undefined),
    })),
    transaction: jest.fn().mockImplementation(async (fn) => {
      const tx = {
        update: jest.fn().mockImplementation(() => ({
          set: jest.fn().mockImplementation(() => ({
            where: jest.fn().mockResolvedValue(undefined),
          })),
        })),
        insert: jest.fn().mockImplementation(() => ({
          values: jest.fn().mockImplementation(() => ({
            returning: jest.fn().mockResolvedValue([{ id: 1 }]),
          })),
        })),
      };
      return fn(tx);
    }),
    query: {
      users: { findFirst: jest.fn(), findMany: jest.fn() },
      userRoles: { findFirst: jest.fn(), findMany: jest.fn() },
      roles: { findFirst: jest.fn(), findMany: jest.fn() },
      topupRequests: { findFirst: jest.fn(), findMany: jest.fn() },
      listings: { findFirst: jest.fn(), findMany: jest.fn() },
      orders: { findFirst: jest.fn(), findMany: jest.fn() },
      disputeTickets: { findFirst: jest.fn(), findMany: jest.fn() },
      walletTransactions: { findFirst: jest.fn(), findMany: jest.fn() },
    },
  });

  beforeEach(async () => {
    mockDb = createMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== Stats ==========

  describe('getStats', () => {
    it('ADM-001: should return system stats successfully', async () => {
      let queryCount = 0;
      mockDb.select = jest.fn().mockImplementation(() => {
        return {
          from: jest.fn().mockImplementation(() => {
            queryCount++;
            if (queryCount === 4) return createQueryBuilder([{ total: '1000' }]);
            if (queryCount === 6) return { where: jest.fn().mockResolvedValue([{ count: 50 }]) };
            return createQueryBuilder([{ count: 100 }]);
          }),
        };
      });

      const result = await service.getStats();
      expect(result.totalUsers).toBe(100);
    });

    it('ADM-002: should return 0 when no data', async () => {
      mockDb.select = jest.fn().mockImplementation(() => {
        return {
          from: jest.fn().mockImplementation(() => createQueryBuilder([{ count: 0 }])),
        };
      });

      const result = await service.getStats();
      expect(result.totalUsers).toBe(0);
    });
  });

  // ========== User Management ==========

  describe('getUsers', () => {
    it('ADM-003: should return paginated list of users', async () => {
      mockDb.select = jest.fn().mockImplementation(() => {
        return {
          from: jest.fn().mockImplementation(() => {
            // Create a builder that supports the full chain
            const baseBuilder: any = Promise.resolve([mockUser]);
            baseBuilder.where = jest.fn().mockReturnValue(baseBuilder);
            baseBuilder.orderBy = jest.fn().mockReturnValue(baseBuilder);
            baseBuilder.limit = jest.fn().mockImplementation(() => {
              const limitBuilder: any = Promise.resolve([mockUser]);
              limitBuilder.offset = jest.fn().mockResolvedValue([mockUser]);
              return limitBuilder;
            });
            return baseBuilder;
          }),
        };
      });

      const result = await service.getUsers({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
    });

    it('ADM-004: should search users by email', async () => {
      mockDb.select = jest.fn().mockImplementation(() => {
        return {
          from: jest.fn().mockImplementation(() => {
            const baseBuilder: any = Promise.resolve([mockUser]);
            baseBuilder.where = jest.fn().mockReturnValue(baseBuilder);
            baseBuilder.orderBy = jest.fn().mockReturnValue(baseBuilder);
            baseBuilder.limit = jest.fn().mockImplementation(() => {
              const limitBuilder: any = Promise.resolve([mockUser]);
              limitBuilder.offset = jest.fn().mockResolvedValue([mockUser]);
              return limitBuilder;
            });
            return baseBuilder;
          }),
        };
      });
      
      // Should return results when searching
      const result = await service.getUsers({ page: 1, limit: 20, search: 'user@example.com' });
      expect(result.data).toBeDefined();
    });

    it('ADM-005: should filter users by active status', async () => {
      mockDb.select = jest.fn().mockImplementation(() => {
        return {
          from: jest.fn().mockImplementation(() => {
            const baseBuilder: any = Promise.resolve([mockUser]);
            baseBuilder.where = jest.fn().mockReturnValue(baseBuilder);
            baseBuilder.orderBy = jest.fn().mockReturnValue(baseBuilder);
            baseBuilder.limit = jest.fn().mockImplementation(() => {
              const limitBuilder: any = Promise.resolve([mockUser]);
              limitBuilder.offset = jest.fn().mockResolvedValue([mockUser]);
              return limitBuilder;
            });
            return baseBuilder;
          }),
        };
      });

      // Should return results when filtering by isActive
      const result = await service.getUsers({ page: 1, limit: 20, isActive: true });
      expect(result.data).toBeDefined();
    });
  });

  describe('getUserById', () => {
    it('ADM-006: should return user by ID', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);
      
      let selectCallCount = 0;
      mockDb.select = jest.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: roles query with innerJoin
          return {
            from: jest.fn().mockImplementation(() => {
              return {
                innerJoin: jest.fn().mockImplementation(() => {
                  return {
                    where: jest.fn().mockResolvedValue([{ id: 1, name: 'USER' }]),
                  };
                }),
              };
            }),
          };
        } else {
          // Second/third calls: count queries with where
          return {
            from: jest.fn().mockImplementation(() => {
              return {
                where: jest.fn().mockResolvedValue([{ count: 5 }]),
              };
            }),
          };
        }
      });

      const result = await service.getUserById(1);
      expect(result.id).toBe(1);
    });

    it('ADM-007: should throw NotFoundException when user not found', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('banUser', () => {
    it('ADM-008: should ban user successfully', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await service.banUser(1);
      expect(result.isActive).toBe(false);
    });

    it('ADM-009: should throw NotFoundException when user not found', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(service.banUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('unbanUser', () => {
    it('ADM-010: should unban user successfully', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockBannedUser);

      const result = await service.unbanUser(1);
      expect(result.isActive).toBe(true);
    });

    it('ADM-011: should throw NotFoundException when user not found', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(service.unbanUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ========== User Roles ==========

  describe('getUserRoles', () => {
    it('ADM-012: should return user roles', async () => {
      mockDb.query.userRoles.findMany.mockResolvedValue([
        { userId: 1, roleId: 1, role: { id: 1, name: 'USER' } },
      ]);

      const result = await service.getUserRoles(1);
      expect(result).toHaveLength(1);
      expect(result[0].role.name).toBe('USER');
    });
  });

  describe('assignRole', () => {
    it('ADM-013: should assign role to user successfully', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await service.assignRole(1, 2, 1);
      expect(result).toBeDefined();
    });

    it('ADM-014: should throw NotFoundException when user not found', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(null);

      await expect(service.assignRole(999, 2, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeRole', () => {
    it('ADM-015: should remove role from user successfully', async () => {
      await service.removeRole(1, 2);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  // ========== Topup Management ==========

  describe('getPendingTopups', () => {
    it('ADM-016: should return pending topup requests', async () => {
      mockDb.query.topupRequests.findMany.mockResolvedValue([mockTopup]);

      const result = await service.getPendingTopups();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('PENDING');
    });
  });

  describe('confirmTopup', () => {
    it('ADM-017: should confirm topup request successfully', async () => {
      mockDb.query.topupRequests.findFirst.mockResolvedValue(mockTopup);

      const result = await service.confirmTopup(1, 1);
      expect(result).toBeDefined();
    });

    it('ADM-018: should throw NotFoundException when topup not found', async () => {
      mockDb.query.topupRequests.findFirst.mockResolvedValue(null);

      await expect(service.confirmTopup(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
