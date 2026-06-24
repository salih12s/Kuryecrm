import { useEffect, useRef, useState } from 'react';
import { trackingApi, type LocationPing } from '../lib/tracking';

type Permission = 'unknown' | 'granted' | 'denied' | 'unsupported';

interface TrackingState {
  active: boolean;
  permission: Permission;
  lastSentAt: number | null;
  restaurantName: string | null;
  error: string | null;
}

const STATUS_POLL_MS = 15_000;

/**
 * Best-effort courier location tracking. While the courier has an active shift,
 * it watches the device position and POSTs it every `intervalSeconds`. It only
 * runs while the tab is alive; if the browser is fully closed no pings are sent
 * and the panel will show the courier as offline (a web platform limitation —
 * true background tracking requires a native app).
 */
export function useCourierTracking(enabled: boolean): TrackingState {
  const [state, setState] = useState<TrackingState>({
    active: false,
    permission: 'unknown',
    lastSentAt: null,
    restaurantName: null,
    error: null,
  });

  const watchId = useRef<number | null>(null);
  const sendTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latest = useRef<GeolocationPosition | null>(null);
  const queue = useRef<LocationPing[]>([]);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);
  const hasSent = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    if (!('geolocation' in navigator)) {
      setState((s) => ({ ...s, permission: 'unsupported', error: 'Tarayıcı konum servisini desteklemiyor.' }));
      return;
    }

    const stopWatch = () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (sendTimer.current) {
        clearInterval(sendTimer.current);
        sendTimer.current = null;
      }
      latest.current = null;
      hasSent.current = false;
    };

    const flush = async () => {
      const pos = latest.current;
      if (!pos) return;
      const ping: LocationPing = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        speed: pos.coords.speed ?? null,
        accuracy: pos.coords.accuracy ?? null,
        deviceStatus: document.visibilityState,
        connectionStatus: navigator.onLine ? 'online' : 'offline',
        recordedAt: new Date(pos.timestamp).toISOString(),
      };
      const batch = [...queue.current, ping];
      queue.current = [];
      try {
        for (const item of batch) {
          // eslint-disable-next-line no-await-in-loop
          await trackingApi.sendLocation(item);
        }
        hasSent.current = true;
        if (!cancelled) setState((s) => ({ ...s, lastSentAt: Date.now(), error: null }));
      } catch {
        // Re-queue the latest ping so a transient failure is retried next tick.
        queue.current = [ping];
      }
    };
    flushRef.current = flush;

    const startWatch = (intervalSeconds: number) => {
      if (watchId.current !== null) return; // already running
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          latest.current = pos;
          if (!cancelled) setState((s) => ({ ...s, permission: 'granted', error: null }));
          // Do not wait for the first interval: make the courier visible as
          // soon as the device provides its first reliable GPS fix.
          if (!hasSent.current) void flushRef.current();
        },
        (err) => {
          if (cancelled) return;
          const denied = err.code === err.PERMISSION_DENIED;
          setState((s) => ({
            ...s,
            permission: denied ? 'denied' : s.permission,
            error: denied ? 'Konum izni reddedildi.' : 'Konum alınamıyor.',
          }));
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
      );
      sendTimer.current = setInterval(flush, Math.max(5, intervalSeconds) * 1000);
    };

    const poll = async () => {
      try {
        const status = await trackingApi.status();
        if (cancelled) return;
        if (status.tracking) {
          setState((s) => ({ ...s, active: true, restaurantName: status.restaurantName }));
          startWatch(status.intervalSeconds);
        } else {
          setState((s) => ({ ...s, active: false, restaurantName: null }));
          stopWatch();
        }
      } catch {
        // Ignore transient status errors; next poll retries.
      }
    };

    poll();
    statusTimer.current = setInterval(poll, STATUS_POLL_MS);
    const resume = () => {
      void poll();
      if (navigator.onLine) void flushRef.current();
    };
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);

    return () => {
      cancelled = true;
      stopWatch();
      if (statusTimer.current) clearInterval(statusTimer.current);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [enabled]);

  return state;
}
