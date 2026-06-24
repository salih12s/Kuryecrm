import { api } from './api';
import type { PartyShift, Shift, ShiftStatus } from '../types';

export interface ShiftFilters {
  dateFrom?: string;
  dateTo?: string;
  restaurantId?: string;
  courierId?: string;
  status?: ShiftStatus;
}

function clean(params: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

// ---------------- Admin ----------------

export const adminShiftsApi = {
  list: async (filters: ShiftFilters) => {
    const res = await api.get<Shift[]>('/admin/shifts', { params: clean(filters) });
    return res.data;
  },
  get: async (id: string) => (await api.get<Shift>(`/admin/shifts/${id}`)).data,
  create: async (payload: Record<string, unknown>) =>
    (await api.post<Shift>('/admin/shifts', clean(payload))).data,
  update: async (id: string, payload: Record<string, unknown>) =>
    // Preserve empty extra-time strings: the backend interprets them as clear.
    (await api.patch<Shift>(`/admin/shifts/${id}`, {
      ...clean(payload),
      ...(payload.extraStartTime === '' ? { extraStartTime: '' } : {}),
      ...(payload.extraEndTime === '' ? { extraEndTime: '' } : {}),
    })).data,
  setStatus: async (id: string, status: ShiftStatus) =>
    (await api.patch<Shift>(`/admin/shifts/${id}/status`, { status })).data,
  approveTime: async (id: string, payload: Record<string, unknown>) =>
    (await api.patch<Shift>(`/admin/shifts/${id}/approve-time`, clean(payload))).data,
};

// ---------------- Restaurant ----------------

export const restaurantShiftsApi = {
  list: async (filters: Pick<ShiftFilters, 'dateFrom' | 'dateTo' | 'status'> = {}) =>
    (await api.get<PartyShift[]>('/restaurant/shifts', { params: clean(filters) })).data,
  get: async (id: string) => (await api.get<PartyShift>(`/restaurant/shifts/${id}`)).data,
  reportTime: async (id: string, payload: Record<string, unknown>) =>
    (await api.patch<PartyShift>(`/restaurant/shifts/${id}/report-time`, clean(payload))).data,
};

// ---------------- Courier ----------------

export const courierShiftsApi = {
  list: async (filters: Pick<ShiftFilters, 'dateFrom' | 'dateTo' | 'status'> = {}) =>
    (await api.get<PartyShift[]>('/courier/shifts', { params: clean(filters) })).data,
  get: async (id: string) => (await api.get<PartyShift>(`/courier/shifts/${id}`)).data,
  reportTime: async (id: string, payload: Record<string, unknown>) =>
    (await api.patch<PartyShift>(`/courier/shifts/${id}/report-time`, clean(payload))).data,
};
