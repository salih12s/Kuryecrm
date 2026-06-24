import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import LiveMap from '../../components/map/LiveMap';
import { liveMapApi, courierStatusText, secondsAgoLabel } from '../../lib/tracking';
import type { LiveMapData } from '../../types';

const POLL_MS = 15_000;

export default function LiveMapPage() {
  const [data, setData] = useState<LiveMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      setData(await liveMapApi.get());
      setError(null);
    } catch {
      setError('Canlı harita yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const couriers = data?.couriers ?? [];
  const onlineCount = couriers.filter((c) => c.online).length;

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Canlı Harita</h1>
          <p className="mt-1 text-sm text-muted">
            Aktif vardiyadaki kuryelerin canlı konumu. {POLL_MS / 1000} saniyede bir güncellenir.
          </p>
        </div>
        <div className="text-sm text-muted">
          Aktif kurye: <b className="text-text">{couriers.length}</b> · Çevrim içi:{' '}
          <b className="text-success">{onlineCount}</b>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="py-12 text-center text-muted">Harita yükleniyor...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {data && <LiveMap data={data} />}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Aktif Kuryeler</h2>
            {couriers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-card p-6 text-center text-sm text-muted">
                Şu an aktif vardiyada kurye yok.
              </div>
            ) : (
              couriers.map((c) => (
                <div key={c.courierId} className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-text">{c.courierName}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        c.online ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {c.online ? 'Çevrim içi' : 'Çevrim dışı'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {c.courierUsername ?? '—'} · {c.courierPlate ?? 'Plaka yok'}
                  </p>
                  <p className="mt-1 text-xs text-text">Restoran: {c.restaurantName}</p>
                  <p className="mt-1 text-xs text-muted">{courierStatusText(c.online, c.hasLocation, c.secondsAgo)}</p>
                  {!c.hasLocation && (
                    <p className="mt-1 text-xs text-danger">Konum servisi kapalı olabilir.</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.isLate && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {c.lateMinutes} dk geç başladı
                      </span>
                    )}
                    {c.overtimeHours > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                        {c.overtimeHours} sa ek mesai
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-muted">
                      Son: {secondsAgoLabel(c.secondsAgo)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
