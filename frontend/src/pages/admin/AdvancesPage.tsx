import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/Modal';
import Field from '../../components/admin/Field';
import { StatusPill } from '../../components/admin/FinanceBadges';
import { accountsApi, advancesApi } from '../../lib/financeApi';
import { couriersApi } from '../../lib/adminApi';
import { formatTL, formatDateTR } from '../../lib/format';
import type { Advance, AdminCourier, CourierAccountSummary } from '../../types';

const today = () => new Date().toISOString().slice(0, 10);

export default function AdvancesPage() {
  const [rows, setRows] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [filters, setFilters] = useState({ courierId: '', dateFrom: '', dateTo: '', status: '' });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Advance | null>(null);
  const [form, setForm] = useState({ courierId: '', amount: '', advanceDate: today(), note: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<CourierAccountSummary | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await advancesApi.list(filters));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    couriersApi.list({ status: 'active' }).then(setCouriers).catch(() => setCouriers([]));
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!open || !form.courierId) {
      setAccount(null);
      return;
    }
    setAccountLoading(true);
    accountsApi.courierSummary(form.courierId)
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => setAccountLoading(false));
  }, [open, form.courierId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ courierId: '', amount: '', advanceDate: today(), note: '' });
    setError(null);
    setOpen(true);
  };
  const openEdit = (a: Advance) => {
    setEditing(a);
    setForm({ courierId: a.courierId, amount: a.amount, advanceDate: a.advanceDate, note: a.note ?? '' });
    setError(null);
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        await advancesApi.update(editing.id, {
          amount: Number(form.amount),
          advanceDate: form.advanceDate,
          note: form.note,
        });
      } else {
        await advancesApi.create({
          courierId: form.courierId,
          amount: Number(form.amount),
          advanceDate: form.advanceDate,
          note: form.note,
        });
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (a: Advance) => {
    try {
      await advancesApi.setStatus(a.id, a.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE');
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  };

  const amount = Number(form.amount || 0);
  const currentAdvanceAmount = editing?.status === 'ACTIVE' ? Number(editing.amount) : 0;
  const availableBeforeThisAdvance = account
    ? account.remainingPayable + currentAdvanceAmount
    : 0;
  const projectedRemaining = availableBeforeThisAdvance - amount;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Avanslar</h1>
        <p className="mt-1 text-sm text-muted">Kurye avanslarını yönetin. Aktif avanslar hak edişten düşülür.</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <Filter label="Kurye">
          <select value={filters.courierId} onChange={(e) => setFilters({ ...filters, courierId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tümü</option>
            {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Filter>
        <Filter label="Başlangıç"><input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Filter>
        <Filter label="Bitiş"><input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Filter>
        <Filter label="Durum">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tümü</option>
            <option value="ACTIVE">Aktif</option>
            <option value="CANCELLED">İptal</option>
          </select>
        </Filter>
        <div className="flex flex-1 items-end justify-end gap-2">
          <button onClick={() => setFilters({ courierId: '', dateFrom: '', dateTo: '', status: '' })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-text hover:bg-slate-100">Temizle</button>
          <button onClick={openCreate} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">+ Yeni Avans Ekle</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Kurye</th>
                <th className="px-4 py-3 font-medium">Tutar</th>
                <th className="px-4 py-3 font-medium">Not</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Kayıt bulunamadı.</td></tr>
              ) : rows.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{formatDateTR(a.advanceDate)}</td>
                  <td className="px-4 py-3 text-text">{a.courierName}</td>
                  <td className="px-4 py-3 text-text">{formatTL(a.amount)}</td>
                  <td className="px-4 py-3 text-muted">{a.note ?? '—'}</td>
                  <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(a)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-text hover:bg-slate-100">Düzenle</button>
                      <button onClick={() => toggle(a)} className={`rounded-md px-2.5 py-1 text-xs font-medium text-white ${a.status === 'ACTIVE' ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'}`}>{a.status === 'ACTIVE' ? 'İptal Et' : 'Aktif Et'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={editing ? 'Avans Düzenle' : 'Yeni Avans Ekle'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          {!editing && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Kurye</span>
              <select required value={form.courierId} onChange={(e) => setForm({ ...form, courierId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Seçiniz</option>
                {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          {accountLoading && <p className="text-sm text-muted">Hak ediş bilgisi yükleniyor...</p>}
          {account && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div><span className="block text-xs text-muted">Toplam Hak Ediş</span><b>{formatTL(account.totalEarnings)}</b></div>
              <div><span className="block text-xs text-muted">Mevcut Kalan Alacak</span><b>{formatTL(availableBeforeThisAdvance)}</b></div>
              <div><span className="block text-xs text-muted">Aktif Avanslar</span><b>{formatTL(account.totalActiveAdvances)}</b></div>
              <div><span className="block text-xs text-muted">Bu Avans Sonrası</span><b className={projectedRemaining < 0 ? 'text-danger' : 'text-success'}>{formatTL(projectedRemaining)}</b></div>
            </div>
          )}
          <Field label="Tutar (₺)" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Field label="Tarih" type="date" required value={form.advanceDate} onChange={(e) => setForm({ ...form, advanceDate: e.target.value })} />
          <Field label="Not" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">İptal</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(' ');
    if (typeof msg === 'string') return msg;
  }
  return 'İşlem başarısız. Tekrar deneyin.';
}
