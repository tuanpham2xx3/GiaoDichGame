import { z } from 'zod';

export const CreateGameSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  iconUrl: z.string().url().optional().nullable(),
  schema: z.array(z.object({
    field: z.string(),
    label: z.string(),
    type: z.enum(['select', 'number', 'text']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
  })).default([]),
});

export const UpdateGameSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  iconUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const UpdateSchemaSchema = z.object({
  schema: z.array(z.object({
    field: z.string(),
    label: z.string(),
    type: z.enum(['select', 'number', 'text']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
  })),
});

export const GameQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateGameDto = z.infer<typeof CreateGameSchema>;
export type UpdateGameDto = z.infer<typeof UpdateGameSchema>;
export type UpdateSchemaDto = z.infer<typeof UpdateSchemaSchema>;
export type GameQueryDto = z.infer<typeof GameQuerySchema>;
