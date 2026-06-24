import { api } from './api';
import type { AdminCourier, AdminRestaurant, StatusFilter } from '../types';

interface ListParams {
  search?: string;
  status?: StatusFilter;
}

/** Drops empty fields so an empty password is "no change" on update. */
function clean<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

// ---------------- Restaurants ----------------

export const restaurantsApi = {
  list: async (params: ListParams) => {
    const res = await api.get<AdminRestaurant[]>('/admin/restaurants', { params });
    return res.data;
  },
  create: async (payload: Record<string, unknown>) => {
    const res = await api.post<AdminRestaurant>('/admin/restaurants', clean(payload));
    return res.data;
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const res = await api.patch<AdminRestaurant>(`/admin/restaurants/${id}`, clean(payload));
    return res.data;
  },
  setStatus: async (id: string, isActive: boolean) => {
    const res = await api.patch<AdminRestaurant>(`/admin/restaurants/${id}/status`, { isActive });
    return res.data;
  },
};

// ---------------- Couriers ----------------

export const couriersApi = {
  list: async (params: ListParams) => {
    const res = await api.get<AdminCourier[]>('/admin/couriers', { params });
    return res.data;
  },
  create: async (payload: Record<string, unknown>) => {
    const res = await api.post<AdminCourier>('/admin/couriers', clean(payload));
    return res.data;
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const res = await api.patch<AdminCourier>(`/admin/couriers/${id}`, clean(payload));
    return res.data;
  },
  setStatus: async (id: string, isActive: boolean) => {
    const res = await api.patch<AdminCourier>(`/admin/couriers/${id}/status`, { isActive });
    return res.data;
  },
};
