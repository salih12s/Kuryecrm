import { useEffect, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import Modal from '../Modal';
import Field from '../admin/Field';
import {
  ShiftStatusBadge,
  ConfirmationBadge,
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
}

/** Self-service shift list + report-time modal, shared by restaurant & courier. */
export default function PartyShiftsView({ title, subtitle, perspective, list, report }: Props) {
  const [rows, setRows] = useState<PartyShift[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PartyShift | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Courier confirmation prompt that pops up on entry for unconfirmed shifts.
  const [confirmTarget, setConfirmTarget] = useState<PartyShift | null>(null);
  const [accepting, setAccepting] = useState(false);
  const dismissed = useRef<Set<string>>(new Set());

  const otherHeader = perspective === 'restaurant' ? 'Kurye' : 'Restoran';
  const otherName = (s: PartyShift) => (perspective === 'restaurant' ? s.courierName : s.restaurantName);
  const myStart = (s: PartyShift) =>
    perspective === 'restaurant' ? s.restaurantReportedStartTime : s.courierReportedStartTime;
  const myEnd = (s: PartyShift) =>
    perspective === 'restaurant' ? s.restaurantReportedEndTime : s.courierReportedEndTime;

  const load = async () => {
    setLoading(true);
    try {
      const data = await list();
      setRows(data);
      // Couriers get a confirmation prompt for the first shift they haven't
      // responded to yet (not cancelled, not finalised, no reported time).
      if (perspective === 'courier') {
        const pending = data.find(
          (s) =>
            s.status !== 'CANCELLED' &&
            s.confirmationStatus !== 'ADMIN_APPROVED' &&
            !s.courierReportedStartTime &&
            !dismissed.current.has(s.id),
        );
        setConfirmTarget(pending ?? null);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Accept the planned times as-is: reports them as the courier's times.
  const acceptPlanned = async () => {
    if (!confirmTarget) return;
    setAccepting(true);
    setError(null);
    try {
      await report(confirmTarget.id, {
        reportedStartTime: confirmTarget.plannedStartTime,
        reportedEndTime: confirmTarget.plannedEndTime,
      });
      setConfirmTarget(null);
      await load();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setAccepting(false);
    }
  };

  const editFromConfirm = () => {
    const s = confirmTarget;
    setConfirmTarget(null);
    if (s) openReport(s);
  };

  const dismissConfirm = () => {
    if (confirmTarget) dismissed.current.add(confirmTarget.id);
    setConfirmTarget(null);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">{otherHeader}</th>
                <th className="px-4 py-3 font-medium">Planlanan</th>
                <th className="px-4 py-3 font-medium">Benim Bildirdiğim</th>
                <th className="px-4 py-3 font-medium">Onaylı Saat</th>
                <th className="px-4 py-3 font-medium">Onay Durumu</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Vardiya bulunamadı.</td></tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="px-4 py-3 font-medium text-text">{formatDateTR(s.date)}</td>
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
                    <td className="px-4 py-3 text-muted">{timeRange(s.plannedStartTime, s.plannedEndTime)}</td>
                    <td className="px-4 py-3 text-muted">{timeRange(myStart(s), myEnd(s))}</td>
                    <td className="px-4 py-3 text-text">
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
                    <td className="px-4 py-3"><ConfirmationBadge status={s.confirmationStatus} /></td>
                    <td className="px-4 py-3"><ShiftStatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openReport(s)}
                        disabled={s.status === 'CANCELLED'}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                      >
                        {s.confirmationStatus === 'ADMIN_APPROVED' ? 'Ek Mesai Bildir' : 'Saat Bildir'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={confirmTarget != null} title="Vardiya Saatini Onayla" onClose={dismissConfirm}>
        {confirmTarget && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
            )}
            <p className="text-sm text-text">
              Yöneticinizin tanımladığı vardiya saatini onaylıyor musunuz?
            </p>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p><b>Tarih:</b> {formatDateTR(confirmTarget.date)}</p>
              <p><b>Restoran:</b> {confirmTarget.restaurantName}</p>
              <p><b>Vardiya saati:</b> {timeRange(confirmTarget.plannedStartTime, confirmTarget.plannedEndTime)}</p>
            </div>
            <p className="text-xs text-muted">
              <b>Kabul Et:</b> bu saatleri aynen onaylar. <b>Farklı Saat Bildir:</b> ek mesai veya
              farklı bir çıkış saati girersiniz.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button onClick={dismissConfirm} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">Daha Sonra</button>
              <button onClick={editFromConfirm} className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10">Farklı Saat Bildir</button>
              <button onClick={() => void acceptPlanned()} disabled={accepting} className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-60">{accepting ? 'Onaylanıyor...' : 'Kabul Et'}</button>
            </div>
          </div>
        )}
      </Modal>

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
              Bildirdiğiniz saatler karşı tarafın bildirimiyle eşleşirse durum “Eşleşti”, farklıysa
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
