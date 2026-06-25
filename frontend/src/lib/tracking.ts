import { api } from './api';
import type { LiveMapData, TrackingStatus } from '../types';

/** Human label for "how long ago" a location was received. */
export function secondsAgoLabel(seconds: number | null): string {
  if (seconds === null) return 'Konum alınamıyor';
  if (seconds < 60) return `${seconds} sn önce`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  return `${hours} sa önce`;
}

/** A short status sentence shown in the live list. */
export function courierStatusText(online: boolean, hasLocation: boolean, secondsAgo: number | null): string {
  if (!hasLocation) return 'Konum alınamıyor (henüz veri yok)';
  if (online) return `Çevrim içi · Son konum ${secondsAgoLabel(secondsAgo)}`;
  return `Çevrim dışı · Son konum ${secondsAgoLabel(secondsAgo)}`;
}

export interface LocationPing {
  latitude: number;
  longitude: number;
  speed?: number | null;
  accuracy?: number | null;
  deviceStatus?: string;
  connectionStatus?: string;
  recordedAt?: string;
}

export const trackingApi = {
  status: async () => (await api.get<TrackingStatus>('/courier/tracking-status')).data,
  sendLocation: async (payload: LocationPing) =>
    (await api.post('/courier/location', payload)).data,
};

export const liveMapApi = {
  get: async () => (await api.get<LiveMapData>('/admin/live-map')).data,
};

export interface ShiftLocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

export const adminTrackingApi = {
  /** GPS trail recorded for a shift (admin/şef), used to resolve time disputes. */
  shiftLocations: async (id: string) =>
    (await api.get<ShiftLocationPoint[]>(`/admin/shifts/${id}/locations`)).data,
};
