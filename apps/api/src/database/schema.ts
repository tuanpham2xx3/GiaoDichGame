import {
  pgTable,
  bigserial,
  varchar,
  boolean,
  timestamp,
  integer,
  primaryKey,
  text,
  decimal,
  bigint,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ================================================================
// USERS
// ================================================================

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ================================================================
// RBAC – Roles, Permissions, Assignments
// ================================================================

export const roles = pgTable('roles', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
  }),
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedBy: bigint('assigned_by', { mode: 'number' }).references(() => users.id),
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.roleId] }),
  }),
);

// ================================================================
// REFRESH TOKENS
// ================================================================

export const refreshTokens = pgTable('refresh_tokens', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  revokedAt: timestamp('revoked_at'),
});

// ================================================================
// WALLET – Ledger (the heart of the system)
// ================================================================

export const walletTransactionTypeEnum = [
  'TOPUP',
  'WITHDRAW',
  'HOLD',
  'RELEASE',
  'SETTLE',
  'REFUND',
  'INSURANCE_LOCK',
  'INSURANCE_UNLOCK',
  'VIP_PURCHASE',
  'PIN_PURCHASE',
] as const;

export const walletTransactionStatusEnum = ['PENDING', 'SUCCESS', 'FAILED'] as const;

export const walletTransactions = pgTable(
  'wallet_transactions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    type: varchar('type', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    referenceId: bigint('reference_id', { mode: 'number' }),
    referenceType: varchar('reference_type', { length: 50 }),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userStatusIdx: index('idx_wallet_user_status').on(t.userId, t.status),
    userTypeIdx: index('idx_wallet_user_type').on(t.userId, t.type),
  }),
);

// ================================================================
// TOPUP / WITHDRAW REQUESTS
// ================================================================

export const topupRequests = pgTable('topup_requests', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  amountCoin: decimal('amount_coin', { precision: 15, scale: 2 }).notNull(),
  amountVnd: decimal('amount_vnd', { precision: 15, scale: 2 }).notNull(),
  method: varchar('method', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  gatewayRef: varchar('gateway_ref', { length: 255 }),
  confirmedBy: bigint('confirmed_by', { mode: 'number' }).references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const withdrawRequests = pgTable('withdraw_requests', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  amountCoin: decimal('amount_coin', { precision: 15, scale: 2 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  bankAccount: varchar('bank_account', { length: 50 }).notNull(),
  bankHolder: varchar('bank_holder', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  gatewayRef: varchar('gateway_ref', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ================================================================
// GAMES & LISTINGS
// ================================================================

export const games = pgTable('games', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  iconUrl: varchar('icon_url', { length: 500 }),
  schema: jsonb('schema').notNull().$type<object[]>(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: bigint('created_by', { mode: 'number' }).references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const listings = pgTable(
  'listings',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sellerId: bigint('seller_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    price: decimal('price', { precision: 15, scale: 2 }).notNull(),
    gameAttributes: jsonb('game_attributes').notNull().$type<Record<string, unknown>>(),
    status: varchar('status', { length: 20 }).notNull().default('PUBLISHED'),
    isPinned: boolean('is_pinned').notNull().default(false),
    pinExpiresAt: timestamp('pin_expires_at'),
    viewCount: integer('view_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    searchIdx: index('idx_listings_search').on(t.gameId, t.status, t.isPinned, t.createdAt),
    sellerIdx: index('idx_listings_seller').on(t.sellerId),
  }),
);

export const listingImages = pgTable('listing_images', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  listingId: bigint('listing_id', { mode: 'number' })
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ================================================================
// ORDERS & ESCROW
// ================================================================

export const orders = pgTable('orders', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  listingId: bigint('listing_id', { mode: 'number' })
    .notNull()
    .references(() => listings.id),
  buyerId: bigint('buyer_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  sellerId: bigint('seller_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  deliveredAt: timestamp('delivered_at'),
  autoCompleteAt: timestamp('auto_complete_at'),
  completedAt: timestamp('completed_at'),
  bullmqJobId: varchar('bullmq_job_id', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const orderDeliveries = pgTable('order_deliveries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orderId: bigint('order_id', { mode: 'number' })
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: 'cascade' }),
  encryptedData: text('encrypted_data').notNull(), // AES-256 encrypted JSON
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ================================================================
// DISPUTE SYSTEM
// ================================================================

export const disputeTickets = pgTable(
  'dispute_tickets',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .unique()
      .references(() => orders.id),
    buyerId: bigint('buyer_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    sellerId: bigint('seller_id', { mode: 'number' })
      .notNull()
      .references(() => users.id),
    assignedTo: bigint('assigned_to', { mode: 'number' }).references(() => users.id),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 30 }).notNull().default('OPEN'),
    sellerDeadline: timestamp('seller_deadline').notNull(),
    resolution: varchar('resolution', { length: 20 }),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at'),
  },
  (t) => ({
    deadlineIdx: index('idx_dispute_deadline').on(t.sellerDeadline, t.status),
  }),
);

export const disputeMessages = pgTable('dispute_messages', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ticketId: bigint('ticket_id', { mode: 'number' })
    .notNull()
    .references(() => disputeTickets.id, { onDelete: 'cascade' }),
  senderId: bigint('sender_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  message: text('message'),
  attachmentUrls: jsonb('attachment_urls').$type<string[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Dispute Settings (Admin Config)
export const disputeSettings = pgTable('dispute_settings', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  value: varchar('value', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: bigint('updated_by', { mode: 'number' }).references(() => users.id),
});

// Dispute Evidence (Files)
export const disputeEvidence = pgTable('dispute_evidence', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ticketId: bigint('ticket_id', { mode: 'number' })
    .notNull()
    .references(() => disputeTickets.id, { onDelete: 'cascade' }),
  uploadedBy: bigint('uploaded_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(),
  fileSize: integer('file_size').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ================================================================
// VIP & PIN
// ================================================================

export const vipPackages = pgTable('vip_packages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  priceCoin: decimal('price_coin', { precision: 15, scale: 2 }).notNull(),
  durationDays: integer('duration_days').notNull(),
  benefits: jsonb('benefits').notNull().$type<Record<string, unknown>>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userVipSubscriptions = pgTable('user_vip_subscriptions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  packageId: integer('package_id')
    .notNull()
    .references(() => vipPackages.id),
  startedAt: timestamp('started_at').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  bullmqJobId: varchar('bullmq_job_id', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
});

export const pinConfig = pgTable('pin_config', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  pricePerDay: decimal('price_per_day', { precision: 15, scale: 2 }).notNull(),
  maxActivePins: integer('max_active_pins'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: bigint('updated_by', { mode: 'number' }).references(() => users.id),
});

export const listingPins = pgTable('listing_pins', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  listingId: bigint('listing_id', { mode: 'number' })
    .notNull()
    .references(() => listings.id),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  days: integer('days').notNull(),
  pricePaid: decimal('price_paid', { precision: 15, scale: 2 }).notNull(),
  startsAt: timestamp('starts_at').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  bullmqJobId: varchar('bullmq_job_id', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ================================================================
// RELATIONS (for Drizzle query API)
// ================================================================

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  walletTransactions: many(walletTransactions),
  listings: many(listings),
  orders: many(orders),
  notifications: many(notifications),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  seller: one(users, { fields: [listings.sellerId], references: [users.id] }),
  game: one(games, { fields: [listings.gameId], references: [games.id] }),
  images: many(listingImages),
  pins: many(listingPins),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, { fields: [listingImages.listingId], references: [listings.id] }),
}));

export const listingPinsRelations = relations(listingPins, ({ one }) => ({
  listing: one(listings, { fields: [listingPins.listingId], references: [listings.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  listing: one(listings, { fields: [orders.listingId], references: [listings.id] }),
  buyer: one(users, { fields: [orders.buyerId], references: [users.id] }),
  seller: one(users, { fields: [orders.sellerId], references: [users.id] }),
  delivery: one(orderDeliveries),
  timeline: many(orderTimeline),
}));

export const orderDeliveriesRelations = relations(orderDeliveries, ({ one }) => ({
  order: one(orders, { fields: [orderDeliveries.orderId], references: [orders.id] }),
}));

// ================================================================
// ORDER TIMELINE
// ================================================================

export const orderTimeline = pgTable('order_timeline', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  orderId: bigint('order_id', { mode: 'number' })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ================================================================
// NOTIFICATIONS
// ================================================================

export const notifications = pgTable('notifications', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  data: jsonb('data').$type<Record<string, unknown>>(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('idx_notifications_user').on(t.userId, t.isRead),
}));

// ================================================================
// RELATIONS (moved after table definitions)
// ================================================================

export const ordersTimelineRelations = relations(orderTimeline, ({ one }) => ({
  order: one(orders, { fields: [orderTimeline.orderId], references: [orders.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
