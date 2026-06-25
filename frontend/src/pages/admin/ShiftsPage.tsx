import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/Modal';
import Field from '../../components/admin/Field';
import { ShiftStatusBadge, ConfirmationBadge } from '../../components/admin/ShiftBadges';
import KebabMenu, { KebabItem } from '../../components/admin/KebabMenu';
import DayTabs from '../../components/admin/DayTabs';
import { adminTrackingApi } from '../../lib/tracking';
import { adminShiftsApi, type ShiftFilters } from '../../lib/shiftsApi';
import { restaurantsApi, couriersApi } from '../../lib/adminApi';
import { formatDateTR, timeRange } from '../../lib/format';
import type {
  AdminCourier,
  AdminRestaurant,
  Shift,
  ShiftStatus,
} from '../../types';

const STATUS_OPTIONS: { value: ShiftStatus; label: string }[] = [
  { value: 'PLANNED', label: 'Planlandı' },
  { value: 'IN_PROGRESS', label: 'Devam Ediyor' },
  { value: 'COMPLETED', label: 'Tamamlandı' },
  { value: 'CANCELLED', label: 'İptal' },
  { value: 'DISPUTED', label: 'Uyuşmazlık' },
];

interface ShiftForm {
  restaurantId: string;
  courierId: string;
  date: string;
  plannedStartTime: string;
  plannedEndTime: string;
  extraStartTime: string;
  extraEndTime: string;
  note: string;
}

const emptyForm: ShiftForm = {
  restaurantId: '',
  courierId: '',
  date: '',
  plannedStartTime: '',
  plannedEndTime: '',
  extraStartTime: '',
  extraEndTime: '',
  note: '',
};

export default function ShiftsPage() {
  const [rows, setRows] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);

  const [filters, setFilters] = useState<ShiftFilters>({});

  // create/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState<ShiftForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // approve-time modal
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Shift | null>(null);
  const [approveForm, setApproveForm] = useState({ start: '', end: '', adminNote: '' });
  const [approveError, setApproveError] = useState<string | null>(null);
  // GPS-derived first/last ping for the shift, used to settle time disputes.
  const [trackedTimes, setTrackedTimes] = useState<{ start: string; end: string } | null>(null);

  // switch-restaurant modal (mid-shift restaurant change)
  const [switchOpen, setSwitchOpen] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<Shift | null>(null);
  const [switchForm, setSwitchForm] = useState({ newRestaurantId: '', switchTime: '' });
  const [switchError, setSwitchError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminShiftsApi.list(filters));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Active restaurants & couriers for the dropdowns.
  useEffect(() => {
    restaurantsApi.list({ status: 'active' }).then(setRestaurants).catch(() => setRestaurants([]));
    couriersApi.list({ status: 'active' }).then(setCouriers).catch(() => setCouriers([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (s: Shift) => {
    setEditing(s);
    setForm({
      restaurantId: s.restaurantId,
      courierId: s.courierId,
      date: s.date,
      plannedStartTime: s.plannedStartTime,
      plannedEndTime: s.plannedEndTime,
      extraStartTime: s.extraStartTime ?? '',
      extraEndTime: s.extraEndTime ?? '',
      note: s.note ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        restaurantId: form.restaurantId,
        courierId: form.courierId,
        date: form.date,
        plannedStartTime: form.plannedStartTime,
        plannedEndTime: form.plannedEndTime,
        extraStartTime: form.extraStartTime,
        extraEndTime: form.extraEndTime,
        note: form.note,
      };
      if (editing) {
        await adminShiftsApi.update(editing.id, payload);
      } else {
        await adminShiftsApi.create(payload);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (s: Shift, status: ShiftStatus) => {
    if (status === 'COMPLETED') {
      openApprove(s);
      return;
    }
    try {
      await adminShiftsApi.setStatus(s.id, status);
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  };

  const cancelShift = async (s: Shift) => {
    if (!confirm('Bu vardiya iptal edilsin mi?')) return;
    await changeStatus(s, 'CANCELLED');
  };

  const openApprove = (s: Shift) => {
    setApproveTarget(s);
    // Prefill from the parties' reported times so extra overtime is captured.
    // For the end time take the later of the two reports (the extra one).
    const start = s.approvedStartTime ?? s.courierReportedStartTime ?? s.restaurantReportedStartTime ?? s.plannedStartTime;
    const end = s.approvedEndTime
      ?? laterTime(s.courierReportedEndTime, s.restaurantReportedEndTime)
      ?? s.plannedEndTime;
    setApproveForm({ start, end, adminNote: s.adminNote ?? '' });
    setApproveError(null);
    setTrackedTimes(null);
    setApproveOpen(true);
    void loadTracked(s.id);
  };

  // Reads the shift's GPS trail and derives the real first/last activity time.
  const loadTracked = async (id: string) => {
    try {
      const points = await adminTrackingApi.shiftLocations(id);
      if (points.length === 0) return;
      const times = points.map((p) => new Date(p.recordedAt).getTime());
      const minIso = points[times.indexOf(Math.min(...times))].recordedAt;
      const maxIso = points[times.indexOf(Math.max(...times))].recordedAt;
      setTrackedTimes({ start: toIstanbulHHmm(minIso), end: toIstanbulHHmm(maxIso) });
    } catch {
      // Tracking is best-effort; ignore if unavailable.
    }
  };

  const submitApprove = async (e: FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;
    setApproveError(null);
    try {
      await adminShiftsApi.approveTime(approveTarget.id, {
        approvedStartTime: approveForm.start,
        approvedEndTime: approveForm.end,
        adminNote: approveForm.adminNote,
      });
      setApproveOpen(false);
      await load();
    } catch (err) {
      setApproveError(extractError(err));
    }
  };

  const openSwitch = (s: Shift) => {
    setSwitchTarget(s);
    setSwitchForm({ newRestaurantId: '', switchTime: '' });
    setSwitchError(null);
    setSwitchOpen(true);
  };

  const submitSwitch = async (e: FormEvent) => {
    e.preventDefault();
    if (!switchTarget) return;
    setSwitchError(null);
    try {
      await adminShiftsApi.switchRestaurant(switchTarget.id, {
        newRestaurantId: switchForm.newRestaurantId,
        switchTime: switchForm.switchTime,
      });
      setSwitchOpen(false);
      await load();
    } catch (err) {
      setSwitchError(extractError(err));
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Vardiyalar</h1>
        <p className="mt-1 text-sm text-muted">Vardiya oluşturun, saat onaylayın, uyuşmazlıkları yönetin.</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <FilterField label="Başlangıç">
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </FilterField>
        <FilterField label="Bitiş">
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </FilterField>
        <FilterField label="Restoran">
          <select
            value={filters.restaurantId ?? ''}
            onChange={(e) => setFilters({ ...filters, restaurantId: e.target.value || undefined })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Tümü</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Kurye">
          <select
            value={filters.courierId ?? ''}
            onChange={(e) => setFilters({ ...filters, courierId: e.target.value || undefined })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Tümü</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Durum">
          <select
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, status: (e.target.value || undefined) as ShiftStatus | undefined })
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">Tümü</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterField>
        <div className="flex flex-1 items-end justify-end gap-2">
          <button
            onClick={() => setFilters({})}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-text hover:bg-slate-100"
          >
            Temizle
          </button>
          <button
            onClick={openCreate}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
          >
            + Yeni Vardiya Ekle
          </button>
        </div>
      </div>

      {/* Day tabs: quick single-day filter for the chosen month. */}
      <DayTabs
        selected={filters.dateFrom && filters.dateFrom === filters.dateTo ? filters.dateFrom : null}
        onSelect={(day) => setFilters({ ...filters, dateFrom: day ?? undefined, dateTo: day ?? undefined })}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-2.5 py-2 font-medium">Tarih</th>
                <th className="px-2.5 py-2 font-medium">Restoran</th>
                <th className="px-2.5 py-2 font-medium">Kurye</th>
                <th className="px-2.5 py-2 font-medium">Planlanan</th>
                <th className="px-2.5 py-2 font-medium">Ekstra</th>
                <th className="px-2.5 py-2 font-medium">Kurye Bild.</th>
                <th className="px-2.5 py-2 font-medium">Onaylı</th>
                <th className="px-2.5 py-2 font-medium">Geç / Mesai</th>
                <th className="px-2.5 py-2 font-medium">Durum</th>
                <th className="px-2.5 py-2 font-medium">Saat Kontrol</th>
                <th className="px-2.5 py-2 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted">Vardiya bulunamadı.</td></tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 align-top">
                    <td className="px-2.5 py-2 font-medium text-text">{formatDateTR(s.date)}</td>
                    <td className="px-2.5 py-2 text-text">
                      {s.restaurantName}
                      {s.segments.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {s.segments.map((seg) => (
                            <div key={seg.id} className="text-[11px] text-muted">
                              {seg.restaurantName}: {timeRange(seg.startTime, seg.endTime)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-text">
                      {s.courierName}
                      {(s.note || s.adminNote) && (
                        <div className="mt-1 space-y-0.5">
                          {s.note && <div className="text-[11px] text-muted">📝 {s.note}</div>}
                          {s.adminNote && <div className="text-[11px] text-amber-700">Yönetici: {s.adminNote}</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-muted">{timeRange(s.plannedStartTime, s.plannedEndTime)}</td>
                    <td className="px-2.5 py-2 text-muted">{timeRange(s.extraStartTime, s.extraEndTime)}</td>
                    <td className="px-2.5 py-2 text-muted">{timeRange(s.courierReportedStartTime, s.courierReportedEndTime)}</td>
                    <td className="px-2.5 py-2 text-muted">{timeRange(s.approvedStartTime, s.approvedEndTime)}</td>
                    <td className="px-2.5 py-2"><LateOvertimeCell shift={s} /></td>
                    <td className="px-2.5 py-2"><ShiftStatusBadge status={s.status} /></td>
                    <td className="px-2.5 py-2"><ConfirmationBadge status={s.confirmationStatus} /></td>
                    <td className="px-2.5 py-2 text-right">
                      <KebabMenu>
                        <KebabItem onClick={() => openApprove(s)} tone="success">Saat Onayla</KebabItem>
                        <KebabItem onClick={() => openEdit(s)}>Düzenle</KebabItem>
                        <KebabItem onClick={() => openSwitch(s)} disabled={s.status === 'CANCELLED'}>Restoran Değiştir</KebabItem>
                        <div className="my-1 border-t border-slate-100" />
                        <KebabItem onClick={() => changeStatus(s, 'PLANNED')} disabled={s.status === 'PLANNED'}>Planlandı işaretle</KebabItem>
                        <KebabItem onClick={() => changeStatus(s, 'IN_PROGRESS')} disabled={s.status === 'IN_PROGRESS'}>Devam Ediyor işaretle</KebabItem>
                        <KebabItem onClick={() => changeStatus(s, 'DISPUTED')} disabled={s.status === 'DISPUTED'}>Uyuşmazlık işaretle</KebabItem>
                        <div className="my-1 border-t border-slate-100" />
                        <KebabItem onClick={() => cancelShift(s)} tone="danger" disabled={s.status === 'CANCELLED'}>İptal Et</KebabItem>
                      </KebabMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      <Modal open={formOpen} title={editing ? 'Vardiya Düzenle' : 'Yeni Vardiya Ekle'} onClose={() => setFormOpen(false)}>
        <form onSubmit={submitForm} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Restoran</span>
              <select
                required
                value={form.restaurantId}
                onChange={(e) => setForm({ ...form, restaurantId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">Seçiniz</option>
                {restaurants.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Kurye</span>
              <select
                required
                value={form.courierId}
                onChange={(e) => setForm({ ...form, courierId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">Seçiniz</option>
                {couriers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </label>
          </div>
          <Field label="Tarih" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Planlanan Başlangıç" type="time" required value={form.plannedStartTime} onChange={(e) => setForm({ ...form, plannedStartTime: e.target.value })} />
            <Field label="Planlanan Bitiş" type="time" required value={form.plannedEndTime} onChange={(e) => setForm({ ...form, plannedEndTime: e.target.value })} />
            <Field label="Ekstra Başlangıç" type="time" value={form.extraStartTime} onChange={(e) => setForm({ ...form, extraStartTime: e.target.value })} hint="Ekstra mesai (opsiyonel, ikisi birlikte)." />
            <Field label="Ekstra Bitiş" type="time" value={form.extraEndTime} onChange={(e) => setForm({ ...form, extraEndTime: e.target.value })} />
          </div>
          <Field label="Not" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">İptal</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>

      {/* Approve-time modal */}
      <Modal open={approveOpen} title="Saat Onayla" onClose={() => setApproveOpen(false)}>
        {approveTarget && (
          <form onSubmit={submitApprove} className="space-y-4">
            {approveError && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{approveError}</div>
            )}
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted">
              <p><b>Restoran bildirimi:</b> {timeRange(approveTarget.restaurantReportedStartTime, approveTarget.restaurantReportedEndTime)}</p>
              <p><b>Kurye bildirimi:</b> {timeRange(approveTarget.courierReportedStartTime, approveTarget.courierReportedEndTime)}</p>
            </div>
            {trackedTimes && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <p className="font-semibold">📍 GPS takibine göre (tarafsız kayıt)</p>
                <p className="mt-0.5">İlk konum: <b>{trackedTimes.start}</b> · Son konum: <b>{trackedTimes.end}</b></p>
                <button
                  type="button"
                  onClick={() => setApproveForm((f) => ({ ...f, start: trackedTimes.start, end: trackedTimes.end }))}
                  className="mt-2 rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
                >
                  GPS saatlerini kullan
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Onaylı Başlangıç" type="time" required value={approveForm.start} onChange={(e) => setApproveForm({ ...approveForm, start: e.target.value })} />
              <Field label="Onaylı Bitiş" type="time" required value={approveForm.end} onChange={(e) => setApproveForm({ ...approveForm, end: e.target.value })} />
            </div>
            <Field label="Yönetici Notu" value={approveForm.adminNote} onChange={(e) => setApproveForm({ ...approveForm, adminNote: e.target.value })} />
            <p className="text-xs text-muted">Onayladığınızda vardiya “Tamamlandı / Onaylandı” durumuna geçer ve hesaplama bu saatlerle yapılır.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setApproveOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">Vazgeç</button>
              <button type="submit" className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90">Onayla</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Switch-restaurant modal */}
      <Modal open={switchOpen} title="Vardiya İçinde Restoran Değiştir" onClose={() => setSwitchOpen(false)}>
        {switchTarget && (
          <form onSubmit={submitSwitch} className="space-y-4">
            {switchError && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{switchError}</div>
            )}
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted">
              <p><b>Kurye:</b> {switchTarget.courierName}</p>
              <p><b>Mevcut restoran:</b> {currentRestaurantName(switchTarget)}</p>
              <p className="mt-1">Girilen saatte mevcut çalışma aralığı kapatılır ve yeni restoranda yeni bir aralık başlatılır. Vardiya tek kayıt olarak kalır.</p>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Yeni Restoran</span>
              <select
                required
                value={switchForm.newRestaurantId}
                onChange={(e) => setSwitchForm({ ...switchForm, newRestaurantId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">Seçiniz</option>
                {restaurants
                  .filter((r) => r.id !== currentRestaurantId(switchTarget))
                  .map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
            </label>
            <Field label="Geçiş Saati" type="time" required value={switchForm.switchTime} onChange={(e) => setSwitchForm({ ...switchForm, switchTime: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSwitchOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">Vazgeç</button>
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">Geçişi Kaydet</button>
            </div>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
}

/** The restaurant the courier is currently working at (last open segment, else primary). */
function currentRestaurantId(s: Shift): string {
  const open = [...s.segments].sort((a, b) => a.sequence - b.sequence).find((seg) => seg.endTime === null);
  return open ? open.restaurantId : s.restaurantId;
}

function currentRestaurantName(s: Shift): string {
  const open = [...s.segments].sort((a, b) => a.sequence - b.sequence).find((seg) => seg.endTime === null);
  return open ? open.restaurantName : s.restaurantName;
}

/** Late-start and overtime badges derived from the shift's planned vs actual times. */
function LateOvertimeCell({ shift }: { shift: Shift }) {
  const hasLate = shift.isLate && shift.lateMinutes > 0;
  const hasOvertime = (shift.overtimeHours ?? 0) > 0;
  if (!hasLate && !hasOvertime) return <span className="text-muted">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {hasLate && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-center text-[11px] font-medium text-amber-700">
          {shift.lateMinutes} dk geç başladı
        </span>
      )}
      {hasOvertime && (
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-center text-[11px] font-medium text-indigo-700">
          {shift.overtimeHours} sa ek mesai
        </span>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Formats an ISO timestamp as "HH:mm" in the operation timezone. */
function toIstanbulHHmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Istanbul',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Returns the later of two "HH:mm" times (ignores nulls). */
function laterTime(a: string | null, b: string | null): string | null {
  if (a && b) return a >= b ? a : b;
  return a ?? b;
}

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
  }
  return 'İşlem başarısız. Tekrar deneyin.';
}
