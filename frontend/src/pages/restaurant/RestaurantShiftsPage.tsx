import { useEffect, useState } from 'react';
import axios from 'axios';
import RestaurantLayout from '../../components/restaurant/RestaurantLayout';
import Modal from '../../components/Modal';
import Field from '../../components/admin/Field';
import { ShiftStatusBadge, ClockPhaseBadge } from '../../components/admin/ShiftBadges';
import { restaurantShiftsApi } from '../../lib/shiftsApi';
import { formatDateTR, timeRange } from '../../lib/format';
import type { PartyShift } from '../../types';

type ConfirmKind = 'start' | 'end';

/**
 * The restaurant views couriers working at it and confirms each courier's live
 * clock-in/out. Confirming accepts the courier's stamped time by default; a
 * different time can be entered (which the admin sees as a dispute).
 */
export default function RestaurantShiftsPage() {
  const [rows, setRows] = useState<PartyShift[]>([]);
  const [loading, setLoading] = useState(true);

  const [target, setTarget] = useState<PartyShift | null>(null);
  const [kind, setKind] = useState<ConfirmKind>('start');
  const [time, setTime] = useState('');
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setRows(await restaurantShiftsApi.list());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Poll so a courier's live clock-in appears without a manual refresh.
  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []);

  const openConfirm = (s: PartyShift, k: ConfirmKind) => {
    setTarget(s);
    setKind(k);
    setTime(k === 'start' ? s.courierStartedAt ?? '' : s.courierEndedAt ?? '');
    setEdit(false);
    setError(null);
  };

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      const override = edit ? time : undefined;
      if (kind === 'start') await restaurantShiftsApi.confirmStart(target.id, override);
      else await restaurantShiftsApi.confirmEnd(target.id, override);
      setTarget(null);
      await load();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = rows.filter((s) => s.pendingParty === 'restaurant').length;

  const confirmButton = (s: PartyShift) => {
    if (s.clockPhase === 'START_PENDING_CONFIRM') {
      return (
        <button
          onClick={() => openConfirm(s, 'start')}
          className="rounded-lg bg-success px-3 py-2 text-xs font-semibold text-white hover:bg-success/90"
        >
          Başlangıcı Onayla
        </button>
      );
    }
    if (s.clockPhase === 'END_PENDING_CONFIRM') {
      return (
        <button
          onClick={() => openConfirm(s, 'end')}
          className="rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-white hover:bg-danger/90"
        >
          Çıkışı Onayla
        </button>
      );
    }
    return <span className="text-xs text-muted">—</span>;
  };

  return (
    <RestaurantLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Kuryeler &amp; Vardiyalar</h1>
        <p className="mt-1 text-sm text-muted">
          Kurye mesaiye başladığında veya çıkış yaptığında onaylayın. İki taraf eşleşene kadar
          vardiya açık kalır.
        </p>
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
          {pendingCount} vardiya onayınızı bekliyor.
        </div>
      )}

      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Yükleniyor...</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Vardiya bulunamadı.</p>
        ) : (
          rows.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-text">{s.courierName}</p>
                  <p className="text-xs text-muted">
                    {formatDateTR(s.date)}
                    {s.courierPlate ? ` · ${s.courierPlate}` : ''}
                  </p>
                </div>
                <ClockPhaseBadge phase={s.clockPhase} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted">Kuryenin başlangıcı</dt>
                <dd className="text-right text-text">{s.courierStartedAt ?? '—'}</dd>
                <dt className="text-muted">Kuryenin çıkışı</dt>
                <dd className="text-right text-text">{s.courierEndedAt ?? '—'}</dd>
                <dt className="text-muted">Onayladığım</dt>
                <dd className="text-right text-text">
                  {timeRange(s.restaurantConfirmedStartAt, s.restaurantConfirmedEndAt)}
                </dd>
                <dt className="text-muted">Durum</dt>
                <dd className="text-right"><ShiftStatusBadge status={s.status} /></dd>
              </dl>
              <div className="mt-3">{confirmButton(s)}</div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="whitespace-nowrap px-4 py-3 font-medium">Tarih</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Kurye</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Plaka</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Kuryenin Başlangıcı</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Kuryenin Çıkışı</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Onayladığım</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Mesai Durumu</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Vardiya bulunamadı.</td></tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-text">{formatDateTR(s.date)}</td>
                    <td className="px-4 py-3 text-text">{s.courierName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{s.courierPlate ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{s.courierStartedAt ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{s.courierEndedAt ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {timeRange(s.restaurantConfirmedStartAt, s.restaurantConfirmedEndAt)}
                    </td>
                    <td className="px-4 py-3"><ClockPhaseBadge phase={s.clockPhase} /></td>
                    <td className="px-4 py-3 text-right">{confirmButton(s)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={target != null}
        title={kind === 'start' ? 'Mesai Başlangıcını Onayla' : 'Mesai Çıkışını Onayla'}
        onClose={() => setTarget(null)}
      >
        {target && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
            )}
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p><b>Kurye:</b> {target.courierName}</p>
              <p><b>Tarih:</b> {formatDateTR(target.date)}</p>
              <p>
                <b>Kuryenin bildirdiği {kind === 'start' ? 'başlangıç' : 'çıkış'}:</b>{' '}
                {(kind === 'start' ? target.courierStartedAt : target.courierEndedAt) ?? '—'}
              </p>
            </div>

            {edit ? (
              <Field
                label={`Onaylanan ${kind === 'start' ? 'başlangıç' : 'çıkış'} saati`}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            ) : (
              <p className="text-xs text-muted">
                Kuryenin bildirdiği saati onaylıyorsunuz. Farklıysa “Farklı saat gir” ile düzeltin;
                bu durumda yöneticiye uyuşmazlık olarak yansır.
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={() => setTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                onClick={() => setEdit((v) => !v)}
                className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
              >
                {edit ? 'Kuryenin saatini kullan' : 'Farklı saat gir'}
              </button>
              <button
                onClick={() => void submit()}
                disabled={saving}
                className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-60"
              >
                {saving ? 'Onaylanıyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </RestaurantLayout>
  );
}

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
  }
  return 'İşlem başarısız. Tekrar deneyin.';
}
