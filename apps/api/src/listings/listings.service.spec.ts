import { Test, TestingModule } from '@nestjs/testing';
import { ListingsService } from './listings.service';
import { DRIZZLE } from '../database/database.module';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockListing = {
  id: 1,
  sellerId: 1,
  gameId: 1,
  title: 'Test Listing',
  description: 'Test description',
  price: '100000',
  gameAttributes: { rank: 'Gold', level: 50 },
  status: 'PUBLISHED',
  isPinned: false,
  viewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGame = {
  id: 1,
  name: 'League of Legends',
  slug: 'league-of-legends',
  iconUrl: 'https://example.com/lol.png',
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
    games: {
      findFirst: jest.fn(),
    },
    listings: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    users: {
      findFirst: jest.fn(),
    },
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ListingsService', () => {
  let service: ListingsService;
  let db: typeof mockDb;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<ListingsService>(ListingsService);
    db = module.get(DRIZZLE);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== Create Listing ==========

  describe('createListing', () => {
    const createDto = {
      gameId: 1,
      title: 'New Listing',
      description: 'Description',
      price: 100000,
      gameAttributes: { rank: 'Gold' },
      images: ['https://example.com/img1.png'],
    };

    it('LST-001: should create listing successfully', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(mockGame);
      (db.insert as any).mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockListing]),
      });

      const result = await service.createListing(createDto, 1);

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Listing');
      expect(db.insert).toHaveBeenCalled();
    });

    it('LST-002: should throw NotFoundException when game not found', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.createListing(createDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // ========== Get Listings ==========

  describe('getListings', () => {
    it('LST-003: should return paginated list of listings', async () => {
      db.query.listings.findMany = jest.fn().mockResolvedValue([mockListing]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 1 }]),
      });

      const result = await service.getListings({ page: 1, limit: 10, status: 'PUBLISHED' });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('LST-004: should filter by game ID', async () => {
      db.query.listings.findMany = jest.fn().mockResolvedValue([mockListing]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 1 }]),
      });

      await service.getListings({ page: 1, limit: 10, gameId: 1, status: 'PUBLISHED' });

      expect(db.query.listings.findMany).toHaveBeenCalled();
    });

    it('LST-005: should filter by price range', async () => {
      db.query.listings.findMany = jest.fn().mockResolvedValue([mockListing]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 1 }]),
      });

      await service.getListings({
        page: 1,
        limit: 10,
        minPrice: 50000,
        maxPrice: 150000,
        status: 'PUBLISHED',
      });

      expect(db.query.listings.findMany).toHaveBeenCalled();
    });

    it('LST-006: should sort by pinned first', async () => {
      db.query.listings.findMany = jest.fn().mockResolvedValue([mockListing]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 1 }]),
      });

      await service.getListings({ page: 1, limit: 10, sort: 'pinned', status: 'PUBLISHED' });

      expect(db.query.listings.findMany).toHaveBeenCalled();
    });
  });

  // ========== Get Listing By ID ==========

  describe('getListingById', () => {
    it('LST-007: should return listing by ID', async () => {
      db.query.listings.findFirst = jest.fn().mockResolvedValue(mockListing);

      const result = await service.getListingById(1);

      expect(result).toEqual(mockListing);
    });

    it('LST-008: should throw NotFoundException when listing not found', async () => {
      db.query.listings.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.getListingById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ========== Update Listing ==========

  describe('updateListing', () => {
    const updateDto = {
      title: 'Updated Title',
      price: 120000,
    };

    it('LST-009: should update listing successfully', async () => {
      db.query.listings.findFirst = jest.fn().mockResolvedValue(mockListing);
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockListing, ...updateDto }]),
      });

      const result = await service.updateListing(1, updateDto, 1);

      expect(result.title).toBe('Updated Title');
      expect(result.price).toBe('120000');
    });

    it('LST-010: should throw NotFoundException when listing not found', async () => {
      db.query.listings.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.updateListing(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('LST-011: should throw ForbiddenException when not owner', async () => {
      db.query.listings.findFirst = jest.fn().mockResolvedValue(mockListing);

      await expect(service.updateListing(1, updateDto, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  // ========== Delete Listing ==========

  describe('deleteListing', () => {
    it('LST-012: should delete listing successfully', async () => {
      db.query.listings.findFirst = jest.fn().mockResolvedValue(mockListing);
      (db.delete as any).mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      });

      await service.deleteListing(1, 1);

      expect(db.delete).toHaveBeenCalled();
    });

    it('LST-013: should throw NotFoundException when listing not found', async () => {
      db.query.listings.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.deleteListing(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('LST-014: should throw ForbiddenException when not owner', async () => {
      db.query.listings.findFirst = jest.fn().mockResolvedValue(mockListing);

      await expect(service.deleteListing(1, 999)).rejects.toThrow(ForbiddenException);
    });
  });

  // ========== Increment View Count ==========

  describe('incrementViewCount', () => {
    it('LST-015: should increment view count', async () => {
      db.query.listings.findFirst = jest.fn().mockResolvedValue(mockListing);
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{}]),
      });

      await service.incrementViewCount(1);

      expect(db.update).toHaveBeenCalled();
    });
  });

  // ========== Get My Listings ==========

  describe('getMyListings', () => {
    it('LST-016: should return user listings', async () => {
      db.query.listings.findMany = jest.fn().mockResolvedValue([mockListing]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 1 }]),
      });

      const result = await service.getMyListings(1, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
    });
  });
});
