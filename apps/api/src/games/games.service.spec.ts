import { Test, TestingModule } from '@nestjs/testing';
import { GamesService } from './games.service';
import { DRIZZLE } from '../database/database.module';
import { NotFoundException, ConflictException } from '@nestjs/common';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGame = {
  id: 1,
  name: 'League of Legends',
  slug: 'league-of-legends',
  iconUrl: 'https://example.com/lol.png',
  schema: [
    { key: 'rank', type: 'select', options: ['Iron', 'Bronze', 'Silver', 'Gold'] },
    { key: 'level', type: 'number' },
  ],
  isActive: true,
  createdBy: 1,
  createdAt: new Date(),
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
      findMany: jest.fn(),
    },
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GamesService', () => {
  let service: GamesService;
  let db: typeof mockDb;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    db = module.get(DRIZZLE);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========== Create Game ==========

  describe('createGame', () => {
    const createDto = {
      name: 'New Game',
      slug: 'new-game',
      iconUrl: 'https://example.com/icon.png',
      schema: [],
    };

    it('GME-001: should create game successfully', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(null);
      (db.insert as any).mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockGame]),
      });

      const result = await service.createGame(createDto, 1);

      expect(result).toEqual(mockGame);
      expect(db.insert).toHaveBeenCalled();
    });

    it('GME-002: should throw ConflictException when slug exists', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(mockGame);

      await expect(service.createGame(createDto, 1)).rejects.toThrow(ConflictException);
    });
  });

  // ========== Get Games ==========

  describe('getGames', () => {
    it('GME-003: should return paginated list of active games', async () => {
      db.query.games.findMany = jest.fn().mockResolvedValue([mockGame]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 1 }]),
      });

      const result = await service.getGames({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('GME-004: should return empty list when no games', async () => {
      db.query.games.findMany = jest.fn().mockResolvedValue([]);
      (db.select as any).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 0 }]),
      });

      const result = await service.getGames({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ========== Get Game By Slug ==========

  describe('getGameBySlug', () => {
    it('GME-005: should return game by slug', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(mockGame);

      const result = await service.getGameBySlug('league-of-legends');

      expect(result).toEqual(mockGame);
      expect(result.slug).toBe('league-of-legends');
    });

    it('GME-006: should throw NotFoundException when game not found', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.getGameBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ========== Get Game By ID ==========

  describe('getGameById', () => {
    it('GME-007: should return game by ID', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(mockGame);

      const result = await service.getGameById(1);

      expect(result).toEqual(mockGame);
      expect(result.id).toBe(1);
    });

    it('GME-008: should throw NotFoundException when game not found', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.getGameById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ========== Update Game ==========

  describe('updateGame', () => {
    const updateDto = {
      name: 'Updated Game Name',
      iconUrl: 'https://example.com/new-icon.png',
    };

    it('GME-009: should update game successfully', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(mockGame);
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockGame, ...updateDto }]),
      });

      const result = await service.updateGame(1, updateDto);

      expect(result.name).toBe('Updated Game Name');
    });

    it('GME-010: should throw NotFoundException when game not found', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.updateGame(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  // ========== Update Schema ==========

  describe('updateSchema', () => {
    const newSchema = [
      { key: 'tier', type: 'select', options: ['I', 'II', 'III', 'IV'] },
    ];

    it('GME-011: should update game schema successfully', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(mockGame);
      (db.update as any).mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...mockGame, schema: newSchema }]),
      });

      const result = await service.updateSchema(1, newSchema);

      expect(result.schema).toEqual(newSchema);
    });

    it('GME-012: should throw NotFoundException when game not found', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.updateSchema(999, newSchema)).rejects.toThrow(NotFoundException);
    });
  });

  // ========== Delete Game ==========

  describe('deleteGame', () => {
    it('GME-013: should delete game successfully', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(mockGame);
      db.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({}),
        }),
      });

      await service.deleteGame(1);

      expect(db.update).toHaveBeenCalled();
    });

    it('GME-014: should throw NotFoundException when game not found', async () => {
      db.query.games.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.deleteGame(999)).rejects.toThrow(NotFoundException);
    });
  });
});
