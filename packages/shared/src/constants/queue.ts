// ============================================================
// BullMQ Queue name constants
// ============================================================

export const QUEUE_NAMES = {
  ORDERS: 'orders',
  DISPUTES: 'disputes',
  PREMIUM: 'premium',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// -------- Job name constants --------

export const JOB_NAMES = {
  AUTO_COMPLETE: 'AUTO_COMPLETE',
  AUTO_REFUND: 'AUTO_REFUND',
  DISPUTE_REMINDER: 'DISPUTE_REMINDER',
  VIP_EXPIRY: 'VIP_EXPIRY',
  PIN_EXPIRY: 'PIN_EXPIRY',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

// -------- Permission key constants --------

export const PERMISSIONS = {
  GAME_MANAGE: 'game:manage',
  DISPUTE_RESOLVE: 'dispute:resolve',
  USER_MANAGE: 'user:manage',
  USER_ASSIGN_ROLE: 'user:assign_role',
  ROLE_MANAGE: 'role:manage',
  VIP_MANAGE: 'vip:manage',
  PIN_MANAGE: 'pin:manage',
  TOPUP_CONFIRM: 'topup:confirm',
  LISTING_MODERATE: 'listing:moderate',
  STATS_VIEW: 'stats:view',
  PROFILE_EDIT: 'profile:edit',
  ORDER_CREATE: 'order:create',
  ORDER_DELIVER: 'order:deliver',
  ORDER_CONFIRM: 'order:confirm',
  ORDER_VIEW: 'order:view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
