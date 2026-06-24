import { api } from './api';
import type { CourierReportRow, DailyReport, DashboardReport, RangeReport, RestaurantReportRow } from '../types';

export const reportsApi = {
  dashboard: async () => (await api.get<DashboardReport>('/admin/reports/dashboard')).data,
  daily: async (date: string) => (await api.get<DailyReport>('/admin/reports/daily', { params: { date } })).data,
  range: async (startDate: string, endDate: string) =>
    (await api.get<RangeReport>('/admin/reports/range', { params: { startDate, endDate } })).data,
  restaurants: async (startDate: string, endDate: string) =>
    (await api.get<RestaurantReportRow[]>('/admin/reports/restaurants', { params: { startDate, endDate } })).data,
  couriers: async (startDate: string, endDate: string) =>
    (await api.get<CourierReportRow[]>('/admin/reports/couriers', { params: { startDate, endDate } })).data,
};
