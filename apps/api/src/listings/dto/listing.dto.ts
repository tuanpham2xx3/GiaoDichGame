import { z } from 'zod';

export const CreateListingSchema = z.object({
  gameId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  price: z.number().positive(),
  gameAttributes: z.record(z.string(), z.unknown()).default({}),
  images: z.array(z.string().url()).optional().default([]),
});

export const UpdateListingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  price: z.number().positive().optional(),
  gameAttributes: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['PUBLISHED', 'LOCKED', 'DELETED']).optional(),
});

export const ListingQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  gameId: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  status: z.enum(['PUBLISHED', 'LOCKED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'DELETED']).default('PUBLISHED'),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'pinned']).default('newest'),
});

export const PinListingSchema = z.object({
  days: z.number().int().positive().min(1).max(30),
});

export type CreateListingDto = z.infer<typeof CreateListingSchema>;
export type UpdateListingDto = z.infer<typeof UpdateListingSchema>;
export type ListingQueryDto = z.infer<typeof ListingQuerySchema>;
export type PinListingDto = z.infer<typeof PinListingSchema>;
