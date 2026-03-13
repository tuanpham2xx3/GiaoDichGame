// ============================================================
// Order types
// ============================================================

export type OrderStatus =
  | 'PENDING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REFUNDED';

export interface OrderSummary {
  id: number;
  listingId: number;
  listingTitle: string;
  buyerId: number;
  sellerId: number;
  amount: string;
  status: OrderStatus;
  deliveredAt: string | null;
  autoCompleteAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// -------- Dispute types --------

export type DisputeStatus =
  | 'OPEN'
  | 'SELLER_RESPONDED'
  | 'AWAITING_DECISION'
  | 'RESOLVED';

export type DisputeResolution = 'REFUND_BUYER' | 'RELEASE_SELLER';
