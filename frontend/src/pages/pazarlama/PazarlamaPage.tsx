import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import DashboardLayout from '../../components/DashboardLayout';
import Modal from '../../components/Modal';
import Field from '../../components/admin/Field';
import { pazarlamaApi, type VisitFilters } from '../../lib/marketingApi';
import { formatDateTR } from '../../lib/format';
import type { MarketingVisit, VisitResult } from '../../types';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  visitDate: today(),
  placeName: '',
  contactName: '',
  phone: '',
  result: 'POSITIVE' as VisitResult,
  operationSize: '',
  negativeReason: '',
  note: '',
};

export default function PazarlamaPage() {
  const [rows, setRows] = useState<MarketingVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VisitFilters>({});

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingVisit | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await pazarlamaApi.list(filters));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  };

  const openEdit = (v: MarketingVisit) => {
    setEditing(v);
    setForm({
      visitDate: v.visitDate,
      placeName: v.placeName,
      contactName: v.contactName ?? '',
      phone: v.phone ?? '',
      result: v.result,
      operationSize: v.operationSize ? String(v.operationSize) : '',
      negativeReason: v.negativeReason ?? '',
      note: v.note ?? '',
    });
    setError(null);
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        visitDate: form.visitDate,
        placeName: form.placeName,
        contactName: form.contactName || undefined,
        phone: form.phone || undefined,
        result: form.result,
        operationSize: form.result === 'POSITIVE' ? Number(form.operationSize) : undefined,
        negativeReason: form.result === 'NEGATIVE' ? form.negativeReason : undefined,
        note: form.note || undefined,
      };
      if (editing) await pazarlamaApi.update(editing.id, payload);
      else await pazarlamaApi.create(payload);
      setOpen(false);
      await load();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (v: MarketingVisit) => {
    if (!confirm(`${v.placeName} görüşme kaydı silinsin mi?`)) return;
    try {
      await pazarlamaApi.remove(v.id);
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  };

  return (
    <DashboardLayout brand="Geliyo" navSections={[{ items: [{ label: 'Görüşmelerim', to: '/pazarlama' }] }]}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Görüşme Kayıtlarım</h1>
          <p className="mt-1 text-sm text-muted">
            Ziyaret ettiğiniz yerleri ve sonucunu buradan kaydedin. Sadece kendi kayıtlarınızı görürsünüz.
          </p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">
          + Yeni Görüşme Ekle
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Başlangıç</span>
          <input type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Bitiş</span>
          <input type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Sonuç</span>
          <select value={filters.result ?? ''} onChange={(e) => setFilters({ ...filters, result: (e.target.value || undefined) as VisitResult | undefined })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tümü</option>
            <option value="POSITIVE">Olumlu</option>
            <option value="NEGATIVE">Olumsuz</option>
          </select>
        </label>
        <button onClick={() => setFilters({})} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-text hover:bg-slate-100">Temizle</button>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Yükleniyor...</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Kayıt bulunamadı.</p>
        ) : rows.map((v) => (
          <div key={v.id} className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-text">{v.placeName}</p>
                <p className="text-xs text-muted">{formatDateTR(v.visitDate)}</p>
              </div>
              <ResultBadge result={v.result} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              {v.result === 'POSITIVE' ? (
                <>
                  <dt className="text-muted">Operasyon</dt>
                  <dd className="text-right text-text">{v.operationSize} kişilik</dd>
                </>
              ) : (
                <>
                  <dt className="text-muted">Neden</dt>
                  <dd className="text-right text-text">{v.negativeReason}</dd>
                </>
              )}
            </dl>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(v)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-text hover:bg-slate-100">Düzenle</button>
              <button onClick={() => remove(v)} className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white hover:bg-danger/90">Sil</button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Yer</th>
                <th className="px-4 py-3 font-medium">Sonuç</th>
                <th className="px-4 py-3 font-medium">Detay</th>
                <th className="px-4 py-3 font-medium">Not</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Kayıt bulunamadı.</td></tr>
              ) : rows.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{formatDateTR(v.visitDate)}</td>
                  <td className="px-4 py-3 text-text">
                    {v.placeName}
                    {(v.contactName || v.phone) && (
                      <div className="text-xs text-muted">{[v.contactName, v.phone].filter(Boolean).join(' · ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><ResultBadge result={v.result} /></td>
                  <td className="px-4 py-3 text-text">{v.result === 'POSITIVE' ? `${v.operationSize} kişilik operasyon` : v.negativeReason}</td>
                  <td className="px-4 py-3 text-muted">{v.note ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(v)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-text hover:bg-slate-100">Düzenle</button>
                      <button onClick={() => remove(v)} className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white hover:bg-danger/90">Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={editing ? 'Görüşme Kaydını Düzenle' : 'Yeni Görüşme Ekle'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          <Field label="Tarih" type="date" required value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} />
          <Field label="Yer / İşletme Adı" required value={form.placeName} onChange={(e) => setForm({ ...form, placeName: e.target.value })} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Yetkili Kişi (opsiyonel)" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <Field label="Telefon (opsiyonel)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-text">Sonuç</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, result: 'POSITIVE' })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${form.result === 'POSITIVE' ? 'border-success bg-success/10 text-success' : 'border-slate-300 text-muted'}`}
              >
                Olumlu
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, result: 'NEGATIVE' })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${form.result === 'NEGATIVE' ? 'border-danger bg-danger/10 text-danger' : 'border-slate-300 text-muted'}`}
              >
                Olumsuz
              </button>
            </div>
          </div>

          {form.result === 'POSITIVE' ? (
            <Field
              label="Kaç Kişilik Operasyon"
              type="number"
              min="1"
              step="1"
              required
              value={form.operationSize}
              onChange={(e) => setForm({ ...form, operationSize: e.target.value })}
            />
          ) : (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Olumsuzluk Nedeni</span>
              <textarea
                required
                rows={3}
                value={form.negativeReason}
                onChange={(e) => setForm({ ...form, negativeReason: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Not (opsiyonel)</span>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">İptal</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}

function ResultBadge({ result }: { result: VisitResult }) {
  return result === 'POSITIVE' ? (
    <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">Olumlu</span>
  ) : (
    <span className="inline-flex rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">Olumsuz</span>
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
