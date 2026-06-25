import { Fragment } from 'react';
import { formatDateTR, formatTL, timeRange } from '../../lib/format';
import type { ReportShift } from '../../types';

/**
 * Simplified, segment-aware shift detail table shared by the daily and period
 * reports. Restaurant switches are listed under the restaurant cell so it is
 * clear where the courier worked and for how long.
 */
export default function ReportShiftTable({ shifts }: { shifts: ReportShift[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <h3 className="border-b border-slate-200 px-4 py-3 font-semibold text-primary">Onaylı Vardiyalar</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Tarih</th>
              <th className="px-3 py-2 font-medium">Restoran</th>
              <th className="px-3 py-2 font-medium">Kurye</th>
              <th className="px-3 py-2 font-medium">Planlanan</th>
              <th className="px-3 py-2 font-medium">Gerçek</th>
              <th className="px-3 py-2 font-medium">Geç / Ek Mesai</th>
              <th className="px-3 py-2 font-medium">Hizmet Bedeli</th>
              <th className="px-3 py-2 font-medium">Kurye Hak Edişi</th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Bu dönem için onaylı vardiya yok.</td></tr>
            ) : (
              shifts.map((s) => {
                const split = s.restaurants.length > 1;
                return (
                  <Fragment key={s.id}>
                    <tr className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2 font-medium text-text">{formatDateTR(s.date)}</td>
                      <td className="px-3 py-2 text-text">
                        {split ? 'Birden fazla restoran' : s.restaurantName}
                        {split && (
                          <div className="mt-1 space-y-0.5">
                            {s.restaurants.map((r) => (
                              <div key={r.restaurantId} className="text-[11px] text-muted">
                                ↳ {r.restaurantName}: {r.hours} sa
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text">{s.courierName}</td>
                      <td className="px-3 py-2 text-muted">{timeRange(s.plannedStartTime, s.plannedEndTime)}</td>
                      <td className="px-3 py-2 text-muted">{timeRange(s.actualStartTime, s.actualEndTime)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          {s.isLate && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-center text-[11px] font-medium text-amber-700">{s.lateMinutes} dk geç</span>}
                          {s.overtimeHours > 0 && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-center text-[11px] font-medium text-indigo-700">{s.overtimeHours} sa ek mesai</span>}
                          {!s.isLate && s.overtimeHours === 0 && <span className="text-muted">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-text">{formatTL(s.restaurantServiceAmount)}</td>
                      <td className="px-3 py-2 text-text">{formatTL(s.courierEarning)}</td>
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
