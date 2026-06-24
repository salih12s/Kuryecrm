import { api } from './api';
import type {
  Advance,
  CourierAccountSummary,
  CourierPayment,
  FinanceTransaction,
  Invoice,
  Payment,
  RestaurantAccountListItem,
  RestaurantAccountSummary,
} from '../types';

function clean(params: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

// ---------------- Advances (admin) ----------------
export const advancesApi = {
  list: async (params: object = {}) =>
    (await api.get<Advance[]>('/admin/advances', { params: clean(params) })).data,
  create: async (payload: object) => (await api.post<Advance>('/admin/advances', clean(payload))).data,
  update: async (id: string, payload: object) =>
    (await api.patch<Advance>(`/admin/advances/${id}`, clean(payload))).data,
  setStatus: async (id: string, status: string) =>
    (await api.patch<Advance>(`/admin/advances/${id}/status`, { status })).data,
};

// ---------------- Invoices (admin) ----------------
export const invoicesApi = {
  list: async (params: object = {}) =>
    (await api.get<Invoice[]>('/admin/restaurant-invoices', { params: clean(params) })).data,
  create: async (payload: object) =>
    (await api.post<Invoice>('/admin/restaurant-invoices', clean(payload))).data,
  update: async (id: string, payload: object) =>
    (await api.patch<Invoice>(`/admin/restaurant-invoices/${id}`, clean(payload))).data,
  setStatus: async (id: string, status: string) =>
    (await api.patch<Invoice>(`/admin/restaurant-invoices/${id}/status`, { status })).data,
};

// ---------------- Payments (admin) ----------------
export const paymentsApi = {
  list: async (params: object = {}) =>
    (await api.get<Payment[]>('/admin/restaurant-payments', { params: clean(params) })).data,
  create: async (payload: object) =>
    (await api.post<Payment>('/admin/restaurant-payments', clean(payload))).data,
  update: async (id: string, payload: object) =>
    (await api.patch<Payment>(`/admin/restaurant-payments/${id}`, clean(payload))).data,
  setStatus: async (id: string, status: string) =>
    (await api.patch<Payment>(`/admin/restaurant-payments/${id}/status`, { status })).data,
};

// ---------------- Finance transactions (admin) ----------------
export const financeTransactionsApi = {
  list: async (params: object = {}) =>
    (await api.get<FinanceTransaction[]>('/admin/finance-transactions', { params: clean(params) })).data,
  create: async (payload: object) =>
    (await api.post<FinanceTransaction>('/admin/finance-transactions', clean(payload))).data,
  update: async (id: string, payload: object) =>
    (await api.patch<FinanceTransaction>(`/admin/finance-transactions/${id}`, clean(payload))).data,
  setStatus: async (id: string, status: string) =>
    (await api.patch<FinanceTransaction>(`/admin/finance-transactions/${id}/status`, { status })).data,
};

// ---------------- Courier payments (admin) ----------------
export const courierPaymentsApi = {
  list: async (params: object = {}) =>
    (await api.get<CourierPayment[]>('/admin/courier-payments', { params: clean(params) })).data,
  create: async (payload: object) =>
    (await api.post<CourierPayment>('/admin/courier-payments', clean(payload))).data,
  update: async (id: string, payload: object) =>
    (await api.patch<CourierPayment>(`/admin/courier-payments/${id}`, clean(payload))).data,
  setStatus: async (id: string, status: string) =>
    (await api.patch<CourierPayment>(`/admin/courier-payments/${id}/status`, { status })).data,
};

// ---------------- Account summaries ----------------
export const accountsApi = {
  courierSummary: async (id: string) =>
    (await api.get<CourierAccountSummary>(`/admin/couriers/${id}/account-summary`)).data,
  restaurantSummary: async (id: string) =>
    (await api.get<RestaurantAccountSummary>(`/admin/restaurants/${id}/account-summary`)).data,
  restaurantAccounts: async () =>
    (await api.get<RestaurantAccountListItem[]>('/admin/restaurant-accounts')).data,
};

// ---------------- Panel (restaurant / courier own) ----------------
export const restaurantPanelApi = {
  summary: async () => (await api.get<RestaurantAccountSummary>('/restaurant/account-summary')).data,
};
export const courierPanelApi = {
  summary: async () => (await api.get<CourierAccountSummary>('/courier/account-summary')).data,
};
