export type ListingStatus = 'PUBLISHED' | 'LOCKED' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'DELETED';
export interface ListingGameAttribute {
    [key: string]: string | number | boolean;
}
export interface ListingCard {
    id: number;
    sellerId: number;
    sellerUsername: string;
    gameId: number;
    gameName: string;
    gameSlug: string;
    title: string;
    price: string;
    gameAttributes: ListingGameAttribute;
    status: ListingStatus;
    isPinned: boolean;
    viewCount: number;
    imageUrls: string[];
    createdAt: string;
}
export type GameSchemaFieldType = 'text' | 'number' | 'select';
export interface GameSchemaField {
    field: string;
    label: string;
    type: GameSchemaFieldType;
    required: boolean;
    options?: string[];
}
export type GameSchema = GameSchemaField[];
//# sourceMappingURL=listing.d.ts.map