import { api } from './api';
import { nowHHmm } from './format';
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
  switchRestaurant: async (id: string, payload: { newRestaurantId: string; switchTime: string }) =>
    (await api.patch<Shift>(`/admin/shifts/${id}/switch-restaurant`, payload)).data,
  // Permanent deletion, for shifts entered by mistake (distinct from status=CANCELLED).
  remove: async (id: string) => {
    await api.delete(`/admin/shifts/${id}`);
  },
};

// ---------------- Restaurant ----------------

export const restaurantShiftsApi = {
  list: async (filters: Pick<ShiftFilters, 'dateFrom' | 'dateTo' | 'status'> = {}) =>
    (await api.get<PartyShift[]>('/restaurant/shifts', { params: clean(filters) })).data,
  get: async (id: string) => (await api.get<PartyShift>(`/restaurant/shifts/${id}`)).data,
  // Confirm the courier's live clock-in/out. Omit `time` to accept the courier's
  // stamped time as-is; pass a time to record a correction.
  confirmStart: async (id: string, time?: string) =>
    (await api.patch<PartyShift>(`/restaurant/shifts/${id}/confirm-start`, time ? { reportedTime: time } : {})).data,
  confirmEnd: async (id: string, time?: string) =>
    (await api.patch<PartyShift>(`/restaurant/shifts/${id}/confirm-end`, time ? { reportedTime: time } : {})).data,
  pendingCount: async () =>
    (await api.get<{ count: number }>('/restaurant/shifts/pending-count')).data.count,
};

// ---------------- Courier ----------------

export const courierShiftsApi = {
  list: async (filters: Pick<ShiftFilters, 'dateFrom' | 'dateTo' | 'status'> = {}) =>
    (await api.get<PartyShift[]>('/courier/shifts', { params: clean(filters) })).data,
  get: async (id: string) => (await api.get<PartyShift>(`/courier/shifts/${id}`)).data,
  reportTime: async (id: string, payload: Record<string, unknown>) =>
    (await api.patch<PartyShift>(`/courier/shifts/${id}/report-time`, clean(payload))).data,
  // Live clock-in/out: stamp the current local time as the courier's start/end.
  clockIn: async (id: string) =>
    (await api.patch<PartyShift>(`/courier/shifts/${id}/report-time`, { reportedStartTime: nowHHmm() })).data,
  clockOut: async (id: string) =>
    (await api.patch<PartyShift>(`/courier/shifts/${id}/report-time`, { reportedEndTime: nowHHmm() })).data,
  waitingCount: async () =>
    (await api.get<{ count: number }>('/courier/shifts/waiting-count')).data.count,
};
