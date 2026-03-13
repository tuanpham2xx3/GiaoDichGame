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
