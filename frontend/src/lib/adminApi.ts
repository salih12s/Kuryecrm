import { api } from './api';
import type { AdminCourier, AdminRestaurant, AdminUser, AppSettings, PendingApprovals, Role, StatusFilter } from '../types';

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
  remove: async (id: string) => {
    await api.delete(`/admin/restaurants/${id}`);
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
  remove: async (id: string) => {
    await api.delete(`/admin/couriers/${id}`);
  },
};

// ---------------- Pending approvals (admin only) ----------------

export const approvalsApi = {
  list: async () => {
    const res = await api.get<PendingApprovals>('/admin/approvals');
    return res.data;
  },
  decideCourier: async (id: string, action: 'approve' | 'reject', note?: string) => {
    const res = await api.patch(`/admin/approvals/couriers/${id}`, { action, note });
    return res.data;
  },
  decideRestaurant: async (id: string, action: 'approve' | 'reject', note?: string) => {
    const res = await api.patch(`/admin/approvals/restaurants/${id}`, { action, note });
    return res.data;
  },
  decideShiftChange: async (id: string, action: 'approve' | 'reject', note?: string) => {
    const res = await api.patch(`/admin/approvals/shift-changes/${id}`, { action, note });
    return res.data;
  },
};

// ---------------- App settings (admin only) ----------------

export const settingsApi = {
  get: async () => (await api.get<AppSettings>('/admin/settings')).data,
  update: async (payload: Partial<Record<keyof AppSettings, string | number>>) =>
    (await api.patch<AppSettings>('/admin/settings', payload)).data,
};

// ---------------- Users & role permissions (admin only) ----------------

export const usersApi = {
  list: async () => (await api.get<AdminUser[]>('/admin/users')).data,
  create: async (payload: { name: string; username: string; password: string; role: Role; isActive: boolean }) =>
    (await api.post<AdminUser>('/admin/users', payload)).data,
  update: async (id: string, payload: Partial<{ name: string; username: string; password: string; role: Role; isActive: boolean }>) =>
    (await api.patch<AdminUser>(`/admin/users/${id}`, clean(payload))).data,
  remove: async (id: string) => (await api.delete<{ id: string }>(`/admin/users/${id}`)).data,
};

export const authApi = {
  changePassword: async (payload: { currentPassword: string; newPassword: string }) =>
    (await api.patch<{ ok: boolean }>('/auth/me/password', payload)).data,
};
