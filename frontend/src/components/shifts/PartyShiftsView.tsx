import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import Modal from '../Modal';
import Field from '../admin/Field';
import {
  ShiftStatusBadge,
  ClockPhaseBadge,
  CourierAckBadge,
  getConfirmationStatusLabel,
} from '../admin/ShiftBadges';
import { formatDateTR, timeRange } from '../../lib/format';
import type { PartyShift } from '../../types';

interface Props {
  title: string;
  subtitle: string;
  /** 'restaurant' shows the courier column; 'courier' shows the restaurant column. */
  perspective: 'restaurant' | 'courier';
  list: () => Promise<PartyShift[]>;
  report: (id: string, payload: Record<string, unknown>) => Promise<PartyShift>;
  /** Live clock-in/out, provided for the courier perspective. */
  clockIn?: (id: string) => Promise<PartyShift>;
  clockOut?: (id: string) => Promise<PartyShift>;
  /** Courier's own plan-acknowledgment toggle, provided for the courier perspective. */
  acknowledge?: (id: string, acknowledged: boolean) => Promise<PartyShift>;
}

/** Self-service shift list with live clock-in/out + manual time correction. */
export default function PartyShiftsView({
  title,
  subtitle,
  perspective,
  list,
  report,
  clockIn,
  clockOut,
  acknowledge,
}: Props) {
  const [rows, setRows] = useState<PartyShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ackBusyId, setAckBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PartyShift | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showAck = perspective === 'courier' && !!acknowledge;
  const otherHeader = perspective === 'restaurant' ? 'Kurye' : 'Restoran';
  const otherName = (s: PartyShift) => (perspective === 'restaurant' ? s.courierName : s.restaurantName);
  const myStart = (s: PartyShift) =>
    perspective === 'restaurant' ? s.restaurantReportedStartTime : s.courierReportedStartTime;
  const myEnd = (s: PartyShift) =>
    perspective === 'restaurant' ? s.restaurantReportedEndTime : s.courierReportedEndTime;

  const load = async () => {
    setLoading(true);
    try {
      setRows(await list());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runClock = async (s: PartyShift, action: (id: string) => Promise<PartyShift>) => {
    setBusyId(s.id);
    setActionError(null);
    try {
      await action(s.id);
      await load();
    } catch (err) {
      setActionError(extractError(err));
    } finally {
      setBusyId(null);
    }
  };

  const toggleAcknowledge = async (s: PartyShift) => {
    if (!acknowledge) return;
    setAckBusyId(s.id);
    setActionError(null);
    try {
      const updated = await acknowledge(s.id, !s.courierAcknowledged);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setActionError(extractError(err));
    } finally {
      setAckBusyId(null);
    }
  };

  const openReport = (s: PartyShift) => {
    setTarget(s);
    setStart(myStart(s) ?? '');
    setEnd(myEnd(s) ?? '');
    setError(null);
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!start && !end) {
      setError('En az bir saat (başlangıç veya bitiş) giriniz.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await report(target.id, { reportedStartTime: start, reportedEndTime: end });
      setOpen(false);
      await load();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  // The single primary action for a courier row, driven by the clock phase.
  const renderActions = (s: PartyShift) => {
    if (perspective !== 'courier' || !clockIn || !clockOut) {
      return (
        <button
          onClick={() => openReport(s)}
          disabled={s.status === 'CANCELLED'}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {s.confirmationStatus === 'ADMIN_APPROVED' ? 'Ek Mesai Bildir' : 'Saat Bildir'}
        </button>
      );
    }

    const busy = busyId === s.id;
    const cancelled = s.status === 'CANCELLED';
    const approved = s.confirmationStatus === 'ADMIN_APPROVED';

    return (
      <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
        {!cancelled && !approved && !s.courierStartedAt && (
          <button
            onClick={() => runClock(s, clockIn)}
            disabled={busy}
            className="rounded-lg bg-success px-3 py-2 text-xs font-semibold text-white hover:bg-success/90 disabled:opacity-60"
          >
            {busy ? '...' : '▶ Mesaiye Başla'}
          </button>
        )}
        {!cancelled && !approved && s.courierStartedAt && !s.courierEndedAt && (
          <button
            onClick={() => runClock(s, clockOut)}
            disabled={busy}
            className="rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-white hover:bg-danger/90 disabled:opacity-60"
          >
            {busy ? '...' : '■ Çıkış Yap'}
          </button>
        )}
        {s.pendingParty === 'restaurant' && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-center text-[11px] font-medium text-amber-700">
            Restoran onayı bekleniyor
          </span>
        )}
        <button
          onClick={() => openReport(s)}
          disabled={cancelled}
          className="text-[11px] font-medium text-accent underline-offset-2 hover:underline disabled:opacity-50"
        >
          {approved ? 'Ek mesai bildir' : 'Saati düzelt'}
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {actionError}
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
                  <p className="font-semibold text-text">{otherName(s)}</p>
                  <p className="text-xs text-muted">{formatDateTR(s.date)}</p>
                </div>
                <ClockPhaseBadge phase={s.clockPhase} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted">Planlanan</dt>
                <dd className="text-right text-text">{timeRange(s.plannedStartTime, s.plannedEndTime)}</dd>
                <dt className="text-muted">Benim bildirdiğim</dt>
                <dd className="text-right text-text">{timeRange(myStart(s), myEnd(s))}</dd>
                <dt className="text-muted">Onaylı saat</dt>
                <dd className="text-right text-text">
                  {s.approvedStartTime ? timeRange(s.approvedStartTime, s.approvedEndTime) : '—'}
                </dd>
                <dt className="text-muted">Durum</dt>
                <dd className="text-right"><ShiftStatusBadge status={s.status} /></dd>
                {showAck && (
                  <>
                    <dt className="text-muted">Plan Onayı</dt>
                    <dd className="text-right">
                      <CourierAckBadge
                        acknowledged={s.courierAcknowledged}
                        onClick={ackBusyId === s.id ? undefined : () => toggleAcknowledge(s)}
                      />
                    </dd>
                  </>
                )}
              </dl>
              <div className="mt-3">{renderActions(s)}</div>
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
                <th className="whitespace-nowrap px-4 py-3 font-medium">{otherHeader}</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Planlanan</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Benim Bildirdiğim</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Onaylı Saat</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Mesai Durumu</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Durum</th>
                {showAck && <th className="whitespace-nowrap px-4 py-3 font-medium">Plan Onayı</th>}
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={showAck ? 9 : 8} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={showAck ? 9 : 8} className="px-4 py-8 text-center text-muted">Vardiya bulunamadı.</td></tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-text">{formatDateTR(s.date)}</td>
                    <td className="px-4 py-3 text-text">
                      {otherName(s)}
                      {perspective === 'courier' && s.segments.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          <div className="text-[11px] font-medium text-accent">Restoran değişimi:</div>
                          {s.segments.map((seg) => (
                            <div key={seg.id} className="text-[11px] text-muted">
                              {seg.restaurantName}: {timeRange(seg.startTime, seg.endTime)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{timeRange(s.plannedStartTime, s.plannedEndTime)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{timeRange(myStart(s), myEnd(s))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-text">
                      {s.approvedStartTime ? (
                        <>
                          {timeRange(s.approvedStartTime, s.approvedEndTime)}
                          {isExtra(s) && (
                            <span className="mt-0.5 block text-[11px] font-medium text-indigo-700">Ek mesai dahil</span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><ClockPhaseBadge phase={s.clockPhase} /></td>
                    <td className="px-4 py-3"><ShiftStatusBadge status={s.status} /></td>
                    {showAck && (
                      <td className="px-4 py-3">
                        <CourierAckBadge
                          acknowledged={s.courierAcknowledged}
                          onClick={ackBusyId === s.id ? undefined : () => toggleAcknowledge(s)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">{renderActions(s)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Saat Bildir" onClose={() => setOpen(false)}>
        {target && (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
            )}
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted">
              <p><b>Tarih:</b> {formatDateTR(target.date)}</p>
              <p><b>Planlanan:</b> {timeRange(target.plannedStartTime, target.plannedEndTime)}</p>
              <p><b>Onay durumu:</b> {getConfirmationStatusLabel(target.confirmationStatus)}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Başlangıç Saati" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              <Field label="Çıkış Saati" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <p className="text-xs text-muted">
              Bildirdiğiniz saatler restoranın onayıyla eşleşirse durum “Eşleşti”, farklıysa
              “Uyuşmazlık Var” olur ve yönetici nihai saati belirler.
            </p>
            {target.confirmationStatus === 'ADMIN_APPROVED' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Bu vardiya onaylanmıştı. Ek mesai bildirdiğinizde yeniden onaya düşer; yönetici onayladıktan sonra hak edişe yansır.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">Vazgeç</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/** True when the approved end runs past the planned end (overtime present). */
function isExtra(s: PartyShift): boolean {
  return !!s.approvedEndTime && s.approvedEndTime > s.plannedEndTime;
}

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
  }
  return 'İşlem başarısız. Tekrar deneyin.';
}
