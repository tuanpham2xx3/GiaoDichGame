export type TransactionType = 'TOPUP' | 'WITHDRAW' | 'HOLD' | 'RELEASE' | 'SETTLE' | 'INSURANCE_LOCK' | 'INSURANCE_UNLOCK' | 'VIP_PURCHASE' | 'PIN_PURCHASE';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export interface WalletTransaction {
    id: number;
    userId: number;
    amount: string;
    type: TransactionType;
    status: TransactionStatus;
    referenceId: number | null;
    referenceType: string | null;
    note: string | null;
    createdAt: string;
}
export interface WalletBalance {
    userId: number;
    balance: string;
}
//# sourceMappingURL=wallet.d.ts.map