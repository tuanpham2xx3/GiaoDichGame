import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import * as bcrypt from 'bcrypt';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: '',
  isActive: true,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRefreshTokens: any[] = [];

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  assignDefaultRole: jest.fn(),
  getPermissions: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock_token'),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test_secret'),
  get: jest.fn().mockReturnValue('15m'),
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── TC-1-01: Register ──────────────────────────────────────────────────────

  describe('register()', () => {
    it('TC-1-01: should create user with hashed password and assign USER role', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.assignDefaultRole.mockResolvedValue(undefined);

      // Mock DB for refresh token insert chain
      mockDb.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([]) }) });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Test1234!',
        username: 'testuser',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com', username: 'testuser' }),
      );
      // password must be hashed (bcrypt)
      const createCall = mockUsersService.create.mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe('Test1234!');
      const isHashed = await bcrypt.compare('Test1234!', createCall.passwordHash);
      expect(isHashed).toBe(true);
      expect(mockUsersService.assignDefaultRole).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw ConflictException if email already used (from UsersService)', async () => {
      mockUsersService.create.mockRejectedValue(new ConflictException('Email already registered'));
      await expect(
        service.register({ email: 'dup@example.com', password: 'Test1234!', username: 'dupuser' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── TC-1-02: validateUser (login wrong password) ───────────────────────────

  describe('validateUser()', () => {
    it('TC-1-02: should return null for wrong password (handler for LocalStrategy)', async () => {
      const hashed = await bcrypt.hash('correct_pass', 10);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hashed });

      const result = await service.validateUser('test@example.com', 'WrongPass');
      expect(result).toBeNull();
    });

    it('should return user object for correct credentials', async () => {
      const hashed = await bcrypt.hash('Test1234!', 10);
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hashed });

      const result = await service.validateUser('test@example.com', 'Test1234!');
      expect(result).toEqual({ userId: mockUser.id, email: mockUser.email });
    });

    it('should return null when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const result = await service.validateUser('nouser@example.com', 'Test1234!');
      expect(result).toBeNull();
    });
  });

  // ── TC-1-03: refreshTokens ────────────────────────────────────────────────

  describe('refreshTokens()', () => {
    it('TC-1-03: should throw UnauthorizedException when no valid refresh token found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        service.refreshTokens(1, 'test@example.com', 'invalid_refresh_token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('TC-1-03b: should return new tokens when valid refresh token is provided', async () => {
      const plainToken = 'valid_refresh_token_plain';
      const tokenHash = await bcrypt.hash(plainToken, 10);

      // DB returns one valid non-revoked token
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              id: 42,
              userId: 1,
              tokenHash,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              revokedAt: null,
            },
          ]),
        }),
      });

      // Revoke old token
      const updateChain = { set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) };
      mockDb.update.mockReturnValue(updateChain);

      // Store new token
      mockDb.insert.mockReturnValue({ values: jest.fn().mockResolvedValue([]) });

      mockJwtService.signAsync.mockResolvedValue('new_mock_token');

      const result = await service.refreshTokens(1, 'test@example.com', plainToken);

      expect(result).toHaveProperty('accessToken', 'new_mock_token');
      expect(result).toHaveProperty('refreshToken', 'new_mock_token');
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });

    it('TC-1-03c: should throw UnauthorizedException when token is already revoked', async () => {
      const plainToken = 'revoked_token';
      const tokenHash = await bcrypt.hash(plainToken, 10);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              id: 43,
              userId: 1,
              tokenHash,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              revokedAt: new Date(), // already revoked
            },
          ]),
        }),
      });

      await expect(
        service.refreshTokens(1, 'test@example.com', plainToken),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── TC-1-04: logout ────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('TC-1-04: should revoke all refresh tokens for user and return success message', async () => {
      const updateChain = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      };
      mockDb.update.mockReturnValue(updateChain);

      const result = await service.logout(1);

      expect(mockDb.update).toHaveBeenCalled();
      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('should return access_token and refresh_token', async () => {
      mockJwtService.signAsync.mockResolvedValue('mock_jwt_token');
      // Mock db insert chain for storeRefreshToken
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await service.login(1, 'test@example.com');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  // ── getMe ──────────────────────────────────────────────────────────────────

  describe('getMe()', () => {
    it('should return user with permissions', async () => {
      mockUsersService.findById.mockResolvedValue({ id: 1, email: 'test@example.com', username: 'testuser' });
      mockUsersService.getPermissions.mockResolvedValue(['profile:edit']);

      const result = await service.getMe(1);
      expect(result).toMatchObject({ id: 1, email: 'test@example.com' });
      expect(result.permissions).toContain('profile:edit');
    });
  });
});
