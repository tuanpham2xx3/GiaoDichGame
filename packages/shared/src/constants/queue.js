"use strict";
// ============================================================
// BullMQ Queue name constants
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = exports.JOB_NAMES = exports.QUEUE_NAMES = void 0;
exports.QUEUE_NAMES = {
    ORDERS: 'orders',
    DISPUTES: 'disputes',
    PREMIUM: 'premium',
};
// -------- Job name constants --------
exports.JOB_NAMES = {
    AUTO_COMPLETE: 'AUTO_COMPLETE',
    AUTO_REFUND: 'AUTO_REFUND',
    VIP_EXPIRY: 'VIP_EXPIRY',
    PIN_EXPIRY: 'PIN_EXPIRY',
};
// -------- Permission key constants --------
exports.PERMISSIONS = {
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
};
//# sourceMappingURL=queue.js.map