import { useEffect, useState } from 'react';
import RestaurantLayout from '../../components/restaurant/RestaurantLayout';
import { ShiftStatusBadge } from '../../components/admin/ShiftBadges';
import { restaurantShiftsApi } from '../../lib/shiftsApi';
import { formatDateTR } from '../../lib/format';
import type { PartyShift } from '../../types';

/**
 * Read-only panel: the restaurant can view the couriers working at it and their
 * shift times, but cannot report or change any times. Time entry and shift
 * management are handled only by admin / Kurye Şefi.
 */
export default function RestaurantShiftsPage() {
  const [rows, setRows] = useState<PartyShift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    restaurantShiftsApi
      .list()
      .then((data) => active && setRows(data))
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <RestaurantLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Kuryeler & Vardiyalar</h1>
        <p className="mt-1 text-sm text-muted">
          Restoranınızda çalışan kuryeleri ve vardiya saatlerini görüntüleyin. Saat girişi ve onayı yetkili
          kullanıcılar tarafından yapılır.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Kurye</th>
                <th className="px-4 py-3 font-medium">Kullanıcı Adı</th>
                <th className="px-4 py-3 font-medium">Motor Plakası</th>
                <th className="px-4 py-3 font-medium">Başlangıç</th>
                <th className="px-4 py-3 font-medium">Bitiş</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Geç / Ek Mesai</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Vardiya bulunamadı.</td></tr>
              ) : (
                rows.map((s) => {
                  const start = s.actualStartTime ?? s.plannedStartTime;
                  const end = s.actualEndTime ?? s.plannedEndTime;
                  const active = s.status === 'IN_PROGRESS';
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-text">{formatDateTR(s.date)}</td>
                      <td className="px-4 py-3 text-text">{s.courierName}</td>
                      <td className="px-4 py-3 text-muted">{s.courierUsername ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{s.courierPlate ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{start ?? '—'}</td>
                      <td className="px-4 py-3 text-muted">{end ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <ShiftStatusBadge status={s.status} />
                          {active && (
                            <span className="rounded-full bg-success/10 px-2 py-0.5 text-center text-[11px] font-medium text-success">
                              Aktif Vardiya
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {s.isLate && s.lateMinutes > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-center text-[11px] font-medium text-amber-700">
                              {s.lateMinutes} dk geç başladı
                            </span>
                          )}
                          {(s.overtimeHours ?? 0) > 0 && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-center text-[11px] font-medium text-indigo-700">
                              {s.overtimeHours} sa ek mesai
                            </span>
                          )}
                          {!(s.isLate && s.lateMinutes > 0) && !((s.overtimeHours ?? 0) > 0) && (
                            <span className="text-muted">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RestaurantLayout>
  );
}
