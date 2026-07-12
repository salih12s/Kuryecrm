import { api } from './api';
import type { MarketingVisit, VisitResult } from '../types';

export interface VisitFilters {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  result?: VisitResult;
}

function clean(params: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

export interface VisitPayload {
  visitDate: string;
  placeName: string;
  contactName?: string;
  phone?: string;
  result: VisitResult;
  operationSize?: number;
  negativeReason?: string;
  note?: string;
}

// ---------------- Pazarlamacı self-service (own rows only) ----------------

export const pazarlamaApi = {
  list: async (filters: VisitFilters = {}) =>
    (await api.get<MarketingVisit[]>('/pazarlama/visits', { params: clean(filters) })).data,
  create: async (payload: VisitPayload) =>
    (await api.post<MarketingVisit>('/pazarlama/visits', clean(payload))).data,
  update: async (id: string, payload: Partial<VisitPayload>) =>
    (await api.patch<MarketingVisit>(`/pazarlama/visits/${id}`, clean(payload))).data,
  remove: async (id: string) => {
    await api.delete(`/pazarlama/visits/${id}`);
  },
};

// ---------------- Admin / Gözlemci (all marketers) ----------------

export const adminMarketingApi = {
  list: async (filters: VisitFilters = {}) =>
    (await api.get<MarketingVisit[]>('/admin/marketing/visits', { params: clean(filters) })).data,
  remove: async (id: string) => {
    await api.delete(`/admin/marketing/visits/${id}`);
  },
};
