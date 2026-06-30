import { api } from './api';
import type {
  AccessoryProduct,
  AccessoryPurchase,
  AccessorySale,
  AccessorySummary,
  Motorcycle,
  MotorcycleSummary,
} from '../types';

function clean(params: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

// ---------------- Motorcycles (admin) ----------------
export const motorcyclesApi = {
  list: async (params: object = {}) =>
    (await api.get<Motorcycle[]>('/admin/motorcycles', { params: clean(params) })).data,
  summary: async () =>
    (await api.get<MotorcycleSummary>('/admin/motorcycles/summary')).data,
  create: async (payload: object) =>
    (await api.post<Motorcycle>('/admin/motorcycles', clean(payload))).data,
  update: async (id: string, payload: object) =>
    (await api.patch<Motorcycle>(`/admin/motorcycles/${id}`, clean(payload))).data,
  remove: async (id: string) => (await api.delete(`/admin/motorcycles/${id}`)).data,
};

// ---------------- Accessories (admin) ----------------
export const accessoriesApi = {
  summary: async (params: object = {}) =>
    (await api.get<AccessorySummary>('/admin/accessories/summary', { params: clean(params) })).data,

  // Distinct named products with current stock (for sale-form autocomplete).
  products: async () =>
    (await api.get<AccessoryProduct[]>('/admin/accessories/products')).data,

  // Purchases
  listPurchases: async (params: object = {}) =>
    (await api.get<AccessoryPurchase[]>('/admin/accessories/purchases', { params: clean(params) })).data,
  createPurchase: async (payload: object) =>
    (await api.post<AccessoryPurchase>('/admin/accessories/purchases', clean(payload))).data,
  updatePurchase: async (id: string, payload: object) =>
    (await api.patch<AccessoryPurchase>(`/admin/accessories/purchases/${id}`, clean(payload))).data,
  removePurchase: async (id: string) =>
    (await api.delete(`/admin/accessories/purchases/${id}`)).data,

  // Sales
  listSales: async (params: object = {}) =>
    (await api.get<AccessorySale[]>('/admin/accessories/sales', { params: clean(params) })).data,
  createSale: async (payload: object) =>
    (await api.post<AccessorySale>('/admin/accessories/sales', clean(payload))).data,
  updateSale: async (id: string, payload: object) =>
    (await api.patch<AccessorySale>(`/admin/accessories/sales/${id}`, clean(payload))).data,
  removeSale: async (id: string) => (await api.delete(`/admin/accessories/sales/${id}`)).data,
};
