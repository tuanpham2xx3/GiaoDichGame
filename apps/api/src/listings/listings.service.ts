import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { eq, asc, desc, and, count, gte, lte, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { listings, listingImages, games, users } from '../database/schema';
import type { DrizzleDB } from '../database/types';
import type { CreateListingDto, UpdateListingDto, ListingQueryDto, PinListingDto } from './dto/listing.dto';

@Injectable()
export class ListingsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
  ) {}

  async createListing(dto: CreateListingDto, sellerId: number) {
    const game = await this.db.query.games.findFirst({
      where: eq(games.id, dto.gameId),
    });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const [listing] = await this.db
      .insert(listings)
      .values({
        sellerId: sellerId,
        gameId: dto.gameId,
        title: dto.title,
        description: dto.description ?? null,
        price: dto.price.toString(),
        gameAttributes: dto.gameAttributes ?? {},
        status: 'PUBLISHED',
      } as typeof listings.$inferInsert)
      .returning();

    if (listing && dto.images && dto.images.length > 0) {
      const imageRecords = dto.images.map((url, index) => ({
        listingId: listing.id,
        url,
        order: index,
      }));
      await this.db.insert(listingImages).values(imageRecords);
    }

    return this.getListingById(listing!.id);
  }

  async getListings(query: ListingQueryDto) {
    const { page, limit, gameId, minPrice, maxPrice, status, sort } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(listings.status, status)];

    if (gameId) {
      conditions.push(eq(listings.gameId, gameId));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(listings.price, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(listings.price, maxPrice.toString()));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(listings)
      .where(whereClause);

    let orderBy;
    switch (sort) {
      case 'price_asc':
        orderBy = asc(listings.price);
        break;
      case 'price_desc':
        orderBy = desc(listings.price);
        break;
      case 'pinned':
        orderBy = [desc(listings.isPinned), desc(listings.createdAt)];
        break;
      default:
        orderBy = desc(listings.createdAt);
    }

    const items = await this.db.query.listings.findMany({
      where: whereClause,
      orderBy,
      limit,
      offset,
      with: {
        listingImages: {
          orderBy: [asc(listingImages.order)],
        },
      },
    });

    const itemsWithGame = await Promise.all(
      items.map(async (item: typeof items[number]) => {
        const game = await this.db.query.games.findFirst({
          where: eq(games.id, item.gameId),
        });
        const seller = await this.db.query.users.findFirst({
          where: eq(users.id, item.sellerId),
          columns: { id: true, username: true, avatarUrl: true },
        });
        return {
          ...item,
          seller: seller ? {
            id: Number(seller.id),
            username: seller.username,
            avatarUrl: seller.avatarUrl,
          } : null,
          game: game ? {
            id: game.id,
            name: game.name,
            slug: game.slug,
            iconUrl: game.iconUrl,
          } : null,
        };
      })
    );

    return {
      items: itemsWithGame,
      total: totalResult?.count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult?.count ?? 0) / limit),
    };
  }

  async getListingById(id: number) {
    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, id),
      with: {
        listingImages: {
          orderBy: [asc(listingImages.order)],
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    await this.db
      .update(listings)
      .set({ viewCount: listing.viewCount + 1 })
      .where(eq(listings.id, id));

    const game = await this.db.query.games.findFirst({
      where: eq(games.id, listing.gameId),
    });

    const seller = await this.db.query.users.findFirst({
      where: eq(users.id, listing.sellerId),
      columns: { id: true, username: true, avatarUrl: true },
    });

    return {
      ...listing,
      seller: seller ? {
        id: Number(seller.id),
        username: seller.username,
        avatarUrl: seller.avatarUrl,
      } : null,
      game: game ? {
        id: game.id,
        name: game.name,
        slug: game.slug,
        iconUrl: game.iconUrl,
        schema: game.schema,
      } : null,
    };
  }

  async updateListing(id: number, dto: UpdateListingDto, userId: number) {
    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, id),
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only edit your own listings');
    }

    if (listing.status !== 'PUBLISHED' && dto.status !== undefined) {
      throw new BadRequestException('Can only edit published listings');
    }

    const updateData: Partial<typeof listings.$inferInsert> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.price !== undefined) updateData.price = dto.price.toString();
    if (dto.gameAttributes !== undefined) updateData.gameAttributes = dto.gameAttributes;
    if (dto.status !== undefined) updateData.status = dto.status;

    const [updated] = await this.db
      .update(listings)
      .set(updateData)
      .where(eq(listings.id, id))
      .returning();

    return updated;
  }

  async deleteListing(id: number, userId: number) {
    const listing = await this.db.query.listings.findFirst({
      where: eq(listings.id, id),
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.db
      .update(listings)
      .set({
        status: 'DELETED',
      })
      .where(eq(listings.id, id));

    return { success: true, message: 'Listing deleted successfully' };
  }

  async getMyListings(userId: number) {
    const items = await this.db.query.listings.findMany({
      where: and(
        eq(listings.sellerId, userId),
        sql`status != 'DELETED'`
      ),
      orderBy: [desc(listings.createdAt)],
      with: {
        listingImages: {
          orderBy: [asc(listingImages.order)],
        },
      },
    });

    return items.map((item: typeof items[number]) => ({
      ...item,
      listingImages: item.listingImages,
    }));
  }

  async getListingsByGame(gameId: number, limit = 10) {
    const items = await this.db.query.listings.findMany({
      where: and(
        eq(listings.gameId, gameId),
        eq(listings.status, 'PUBLISHED')
      ),
      orderBy: [desc(listings.isPinned), desc(listings.createdAt)],
      limit,
      with: {
        listingImages: {
          orderBy: [asc(listingImages.order)],
          limit: 1,
        },
      },
    });

    return items;
  }
}
