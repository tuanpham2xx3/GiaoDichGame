import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from localStorage to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (originalRequest) {
        originalRequest._retry = true;
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) throw new Error('No refresh token');
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, null, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          localStorage.setItem('access_token', data.accessToken);
          localStorage.setItem('refresh_token', data.refreshToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          }
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// ============================================================
// Games API
// ============================================================

export interface Game {
  id: number;
  name: string;
  slug: string;
  iconUrl: string | null;
  schema: Array<{
    field: string;
    label: string;
    type: 'text' | 'number' | 'select';
    required: boolean;
    options?: string[];
  }>;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
}

export interface GamesResponse {
  items: Game[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const gamesApi = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const { data } = await api.get<GamesResponse>('/v1/games', { params });
    return data;
  },
  getBySlug: async (slug: string) => {
    const { data } = await api.get<Game>(`/v1/games/${slug}`);
    return data;
  },
  create: async (payload: { name: string; slug: string; iconUrl?: string }) => {
    const { data } = await api.post<Game>('/v1/games', payload);
    return data;
  },
  update: async (id: number, payload: Partial<{ name: string; iconUrl: string; isActive: boolean }>) => {
    const { data } = await api.patch<Game>(`/v1/games/${id}`, payload);
    return data;
  },
  updateSchema: async (id: number, schema: Game['schema']) => {
    const { data } = await api.put<Game>(`/v1/games/${id}/schema`, schema);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/v1/games/${id}`);
    return data;
  },
};

// ============================================================
// Listings API
// ============================================================

export interface Listing {
  id: number;
  sellerId: number;
  gameId: number;
  title: string;
  description: string | null;
  price: string;
  gameAttributes: Record<string, unknown>;
  status: string;
  isPinned: boolean;
  pinExpiresAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  listingImages?: Array<{ id: number; url: string; order: number }>;
  seller?: { id: number; username: string; avatarUrl: string | null };
  game?: { id: number; name: string; slug: string; iconUrl: string | null; schema?: Game['schema'] };
}

export interface ListingsResponse {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListingsQuery {
  page?: number;
  limit?: number;
  gameId?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: 'PUBLISHED' | 'LOCKED' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'DELETED';
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'pinned';
}

export const listingsApi = {
  getAll: async (params?: ListingsQuery) => {
    const { data } = await api.get<ListingsResponse>('/v1/listings', { params });
    return data;
  },
  getById: async (id: number) => {
    const { data } = await api.get<Listing>(`/v1/listings/${id}`);
    return data;
  },
  getMyListings: async () => {
    const { data } = await api.get<Listing[]>('/v1/listings/my/listings');
    return data;
  },
  create: async (payload: {
    gameId: number;
    title: string;
    description?: string;
    price: number;
    gameAttributes: Record<string, unknown>;
    images?: string[];
  }) => {
    const { data } = await api.post<Listing>('/v1/listings', payload);
    return data;
  },
  update: async (id: number, payload: Partial<{
    title: string;
    description: string;
    price: number;
    gameAttributes: Record<string, unknown>;
    status: string;
  }>) => {
    const { data } = await api.patch<Listing>(`/v1/listings/${id}`, payload);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/v1/listings/${id}`);
    return data;
  },
};

// ============================================================
// Orders API
// ============================================================

export interface Order {
  id: number;
  listingId: number;
  buyerId: number;
  sellerId: number;
  amount: string;
  status: 'PENDING' | 'LOCKED' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';
  deliveredAt: string | null;
  completedAt: string | null;
  autoCompleteAt: string | null;
  timeline?: Array<{
    status: string;
    note: string;
    createdAt: string;
  }>;
  isBuyer?: boolean;
  canDeliver?: boolean;
  canConfirm?: boolean;
}

export interface OrdersResponse {
  items: Order[];
}

export const ordersApi = {
  getOrders: async () => {
    const { data } = await api.get<OrdersResponse>('/v1/orders');
    return data;
  },
  getOrder: async (id: number) => {
    const { data } = await api.get<Order>(`/v1/orders/${id}`);
    return data;
  },
  createOrder: async (listingId: number) => {
    const { data } = await api.post<Order>('/v1/orders', { listing_id: listingId });
    return data;
  },
  deliverOrder: async (id: number, payload: { username?: string; password?: string; extra_info?: Record<string, unknown> }) => {
    const { data } = await api.post<Order>(`/v1/orders/${id}/deliver`, payload);
    return data;
  },
  confirmReceipt: async (id: number) => {
    const { data } = await api.post<Order>(`/v1/orders/${id}/confirm`);
    return data;
  },
  getGameInfo: async (id: number) => {
    const { data } = await api.get<{ gameInfo: Record<string, unknown> }>(`/v1/orders/${id}/game-info`);
    return data;
  },
};

// ============================================================
// Notifications API
// ============================================================

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  content: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const notificationsApi = {
  getNotifications: async (params?: { page?: number; limit?: number; unread_only?: boolean }) => {
    const { data } = await api.get<NotificationsResponse>('/v1/notifications', { params });
    return data;
  },
  getUnreadCount: async () => {
    const { data } = await api.get<{ count: number }>('/v1/notifications/unread-count');
    return data;
  },
  markAsRead: async (id: number) => {
    const { data } = await api.post<Notification>(`/v1/notifications/${id}/read`);
    return data;
  },
  markAllAsRead: async () => {
    const { data } = await api.post('/v1/notifications/read-all');
    return data;
  },
};

// ============================================================
// Disputes API
// ============================================================

export interface DisputeMessage {
  id: number;
  senderId: number;
  message: string;
  attachmentUrls: string[] | null;
  createdAt: string;
}

export interface Dispute {
  id: number;
  orderId: number;
  buyerId: number;
  sellerId: number;
  reason: string;
  status: 'OPEN' | 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'WITHDRAWN';
  resolution: 'REFUND' | 'RELEASE' | null;
  resolutionNote: string | null;
  sellerDeadline: string;
  createdAt: string;
  resolvedAt: string | null;
  isBuyer?: boolean;
  isSeller?: boolean;
  isAdmin?: boolean;
  order?: {
    id: number;
    listingTitle: string;
    amount: string;
    status: string;
  };
  messages?: DisputeMessage[];
}

export interface DisputesResponse {
  data: Dispute[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface CreateDisputeDto {
  orderId: string;
  reason: 'account_not_received' | 'account_invalid' | 'account_not_as_described' | 'other';
  description: string;
}

export interface SendMessageDto {
  message: string;
}

export interface JudgeDisputeDto {
  decision: 'REFUND' | 'RELEASE';
  note?: string;
}

export interface DisputeStats {
  total: number;
  open: number;
  underReview: number;
  resolved: number;
  refunded: number;
  released: number;
}

export interface DisputeSettings {
  auto_refund_hours: string;
}

export const disputesApi = {
  // User endpoints
  getDisputes: async (params?: { status?: string }) => {
    const { data } = await api.get<Dispute[]>('/disputes', { params });
    return data;
  },
  getDispute: async (id: number) => {
    const { data } = await api.get<Dispute>(`/disputes/${id}`);
    return data;
  },
  createDispute: async (payload: CreateDisputeDto) => {
    const { data } = await api.post<Dispute>('/disputes', payload);
    return data;
  },
  withdrawDispute: async (id: number, reason?: string) => {
    const { data } = await api.post(`/disputes/${id}/withdraw`, { reason });
    return data;
  },
  sendMessage: async (id: number, payload: SendMessageDto) => {
    const { data } = await api.post<DisputeMessage>(`/disputes/${id}/messages`, payload);
    return data;
  },
  getMessages: async (id: number) => {
    const { data } = await api.get<DisputeMessage[]>(`/disputes/${id}/messages`);
    return data;
  },
  uploadEvidence: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/disputes/${id}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getEvidence: async (id: number) => {
    const { data } = await api.get<Array<{
      id: number;
      uploadedBy: number;
      fileName: string;
      fileType: string;
      fileSize: number;
      filePath: string;
      createdAt: string;
    }>>(`/disputes/${id}/evidence`);
    return data;
  },

  // Admin endpoints
  getAllDisputes: async (params?: {
    status?: string;
    buyerId?: number;
    sellerId?: number;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await api.get<DisputesResponse>('/admin/disputes', { params });
    return data;
  },
  getDisputeStats: async () => {
    const { data } = await api.get<DisputeStats>('/admin/disputes/stats');
    return data;
  },
  judgeDispute: async (id: number, payload: JudgeDisputeDto) => {
    const { data } = await api.post<Dispute>(`/admin/disputes/${id}/judge`, payload);
    return data;
  },
  getSettings: async () => {
    const { data } = await api.get<DisputeSettings>('/admin/disputes/settings');
    return data;
  },
  updateSettings: async (key: string, value: string) => {
    const { data } = await api.post('/admin/disputes/settings', { key, value });
    return data;
  },
};
