import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gt } from 'drizzle-orm';
import * as schema from '../database/schema';
import { DRIZZLE } from '../database/database.module';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '@giaodich/shared';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: Db,
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return { userId: user.id, email: user.email };
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const createdUser = await this.usersService.create({
      email: dto.email,
      passwordHash,
      username: dto.username,
    });
    await this.usersService.assignDefaultRole(createdUser.id);
    return {
      id: createdUser.id,
      email: createdUser.email,
      username: createdUser.username,
      createdAt: createdUser.createdAt,
    };
  }

  async login(userId: number, email: string) {
    const tokens = await this.generateTokens(userId, email);
    await this.storeRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  async refreshTokens(userId: number, email: string, oldRefreshToken: string) {
    // Find all valid non-revoked tokens for user
    const tokens = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.userId, userId),
          gt(schema.refreshTokens.expiresAt, new Date()),
        ),
      );

    let found = false;
    for (const t of tokens) {
      if (t.revokedAt) continue;
      const matches = await bcrypt.compare(oldRefreshToken, t.tokenHash);
      if (matches) {
        found = true;
        // Revoke old token
        await this.db
          .update(schema.refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(schema.refreshTokens.id, t.id));
        break;
      }
    }

    if (!found) throw new UnauthorizedException('Invalid refresh token');

    const newTokens = await this.generateTokens(userId, email);
    await this.storeRefreshToken(userId, newTokens.refreshToken);
    return newTokens;
  }

  async logout(userId: number) {
    // Revoke all refresh tokens for user
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.refreshTokens.userId, userId),
          // skip already revoked
        ),
      );
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: number) {
    const user = await this.usersService.findById(userId);
    const permissions = await this.usersService.getPermissions(userId);
    return { ...user, permissions };
  }

  private async generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ?? '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as any,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: number, refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.db.insert(schema.refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  }
}
