import { useEffect, useState, type FormEvent } from 'react';
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
                <th className="px-4 py-3 font-medium">Ekstra</th>
                <th className="px-4 py-3 font-medium">Benim Bildirdiğim</th>
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
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{formatDateTR(s.date)}</td>
                    <td className="px-4 py-3 text-text">{otherName(s)}</td>
                    <td className="px-4 py-3 text-muted">{timeRange(s.plannedStartTime, s.plannedEndTime)}</td>
                    <td className="px-4 py-3 text-muted">{timeRange(s.extraStartTime, s.extraEndTime)}</td>
                    <td className="px-4 py-3 text-muted">{timeRange(myStart(s), myEnd(s))}</td>
                    <td className="px-4 py-3"><ConfirmationBadge status={s.confirmationStatus} /></td>
                    <td className="px-4 py-3"><ShiftStatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openReport(s)}
                        disabled={s.status === 'CANCELLED' || s.confirmationStatus === 'ADMIN_APPROVED'}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                      >
                        Saat Bildir
                      </button>
                    </td>
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
              Bildirdiğiniz saatler karşı tarafın bildirimiyle eşleşirse durum “Eşleşti”, farklıysa
              “Uyuşmazlık Var” olur ve yönetici nihai saati belirler.
            </p>
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

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
  }
  return 'İşlem başarısız. Tekrar deneyin.';
}
