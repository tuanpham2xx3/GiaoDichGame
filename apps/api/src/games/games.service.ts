import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { eq, asc, desc, and, count } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { games } from '../database/schema';
import type { DrizzleDB } from '../database/types';
import type { CreateGameDto, UpdateGameDto, UpdateSchemaDto, GameQueryDto } from './dto/game.dto';

@Injectable()
export class GamesService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
  ) {}

  async createGame(dto: CreateGameDto, userId: number) {
    const existing = await this.db.query.games.findFirst({
      where: eq(games.slug, dto.slug),
    });
    if (existing) {
      throw new ConflictException('Game with this slug already exists');
    }

    const [game] = await this.db
      .insert(games)
      .values({
        name: dto.name,
        slug: dto.slug,
        iconUrl: dto.iconUrl ?? null,
        schema: dto.schema ?? [],
        isActive: true,
        createdBy: userId,
      } as typeof games.$inferInsert)
      .returning();

    return game;
  }

  async getGames(query: GameQueryDto) {
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(games)
      .where(eq(games.isActive, true));

    const items = await this.db.query.games.findMany({
      where: eq(games.isActive, true),
      orderBy: [asc(games.name)],
      limit,
      offset,
    });

    return {
      items,
      total: totalResult?.count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult?.count ?? 0) / limit),
    };
  }

  async getGameBySlug(slug: string) {
    const game = await this.db.query.games.findFirst({
      where: and(eq(games.slug, slug), eq(games.isActive, true)),
    });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  async getGameById(id: number) {
    const game = await this.db.query.games.findFirst({
      where: eq(games.id, id),
    });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  async updateGame(id: number, dto: UpdateGameDto) {
    const existing = await this.getGameById(id);
    if (!existing) {
      throw new NotFoundException('Game not found');
    }

    const [updated] = await this.db
      .update(games)
      .set(dto as typeof games.$inferInsert)
      .where(eq(games.id, id))
      .returning();

    return updated;
  }

  async updateSchema(id: number, dto: UpdateSchemaDto) {
    const existing = await this.getGameById(id);
    if (!existing) {
      throw new NotFoundException('Game not found');
    }

    const [updated] = await this.db
      .update(games)
      .set({ schema: dto.schema } as typeof games.$inferInsert)
      .where(eq(games.id, id))
      .returning();

    return updated;
  }

  async deleteGame(id: number) {
    const existing = await this.getGameById(id);
    if (!existing) {
      throw new NotFoundException('Game not found');
    }

    await this.db
      .update(games)
      .set({
        isActive: false,
      })
      .where(eq(games.id, id));

    return { success: true, message: 'Game deactivated successfully' };
  }
}
