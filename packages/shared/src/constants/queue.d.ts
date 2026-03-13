export declare const QUEUE_NAMES: {
    readonly ORDERS: "orders";
    readonly DISPUTES: "disputes";
    readonly PREMIUM: "premium";
};
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
export declare const JOB_NAMES: {
    readonly AUTO_COMPLETE: "AUTO_COMPLETE";
    readonly AUTO_REFUND: "AUTO_REFUND";
    readonly VIP_EXPIRY: "VIP_EXPIRY";
    readonly PIN_EXPIRY: "PIN_EXPIRY";
};
export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
export declare const PERMISSIONS: {
    readonly GAME_MANAGE: "game:manage";
    readonly DISPUTE_RESOLVE: "dispute:resolve";
    readonly USER_MANAGE: "user:manage";
    readonly USER_ASSIGN_ROLE: "user:assign_role";
    readonly ROLE_MANAGE: "role:manage";
    readonly VIP_MANAGE: "vip:manage";
    readonly PIN_MANAGE: "pin:manage";
    readonly TOPUP_CONFIRM: "topup:confirm";
    readonly LISTING_MODERATE: "listing:moderate";
    readonly STATS_VIEW: "stats:view";
    readonly PROFILE_EDIT: "profile:edit";
};
export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
//# sourceMappingURL=queue.d.ts.map