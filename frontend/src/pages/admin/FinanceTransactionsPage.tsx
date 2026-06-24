import { useEffect, useState, type FormEvent } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/Modal';
import Field from '../../components/admin/Field';
import { StatusPill, TxTypeBadge } from '../../components/admin/FinanceBadges';
import { financeTransactionsApi } from '../../lib/financeApi';
import { formatTL, formatDateTR } from '../../lib/format';
import type { FinanceTransaction, FinanceTransactionType } from '../../types';
import { extractError } from './AdvancesPage';
import { useAuth } from '../../context/AuthContext';
import { canEditFinance } from '../../lib/permissions';

const today = () => new Date().toISOString().slice(0, 10);

export default function FinanceTransactionsPage() {
  const { user } = useAuth();
  const canEdit = canEditFinance(user);
  const [rows, setRows] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', category: '', dateFrom: '', dateTo: '', status: '' });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [form, setForm] = useState({
    type: 'EXPENSE' as FinanceTransactionType,
    title: '',
    category: '',
    amount: '',
    transactionDate: today(),
    note: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await financeTransactionsApi.list(filters));
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
    setForm({ type: 'EXPENSE', title: '', category: '', amount: '', transactionDate: today(), note: '' });
    setError(null);
    setOpen(true);
  };
  const openEdit = (t: FinanceTransaction) => {
    setEditing(t);
    setForm({
      type: t.type,
      title: t.title,
      category: t.category ?? '',
      amount: t.amount,
      transactionDate: t.transactionDate,
      note: t.note ?? '',
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
        type: form.type,
        title: form.title,
        category: form.category,
        amount: Number(form.amount),
        transactionDate: form.transactionDate,
        note: form.note,
      };
      if (editing) await financeTransactionsApi.update(editing.id, payload);
      else await financeTransactionsApi.create(payload);
      setOpen(false);
      await load();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (t: FinanceTransaction) => {
    try {
      await financeTransactionsApi.setStatus(t.id, t.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE');
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Gelir / Gider</h1>
        <p className="mt-1 text-sm text-muted">Genel gelir-gider ve masraf kayıtları.</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <Filter label="Tür">
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tümü</option>
            <option value="INCOME">Gelir</option>
            <option value="EXPENSE">Gider</option>
          </select>
        </Filter>
        <Filter label="Kategori"><input value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} placeholder="Ara..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Filter>
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
          <button onClick={() => setFilters({ type: '', category: '', dateFrom: '', dateTo: '', status: '' })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-text hover:bg-slate-100">Temizle</button>
          {canEdit && (
            <button onClick={openCreate} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">+ Yeni Kayıt</button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Başlık</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Tutar</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Kayıt bulunamadı.</td></tr>
              ) : rows.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{formatDateTR(t.transactionDate)}</td>
                  <td className="px-4 py-3"><TxTypeBadge type={t.type} /></td>
                  <td className="px-4 py-3 text-text">{t.title}</td>
                  <td className="px-4 py-3 text-muted">{t.category ?? '—'}</td>
                  <td className="px-4 py-3 text-text">{formatTL(t.amount)}</td>
                  <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(t)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-text hover:bg-slate-100">Düzenle</button>
                        <button onClick={() => toggle(t)} className={`rounded-md px-2.5 py-1 text-xs font-medium text-white ${t.status === 'ACTIVE' ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'}`}>{t.status === 'ACTIVE' ? 'İptal Et' : 'Aktif Et'}</button>
                      </div>
                    ) : (
                      <span className="block text-right text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={editing ? 'Kayıt Düzenle' : 'Yeni Gelir/Gider Kaydı'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Tür</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FinanceTransactionType, category: '' })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="EXPENSE">Gider</option>
              <option value="INCOME">Gelir</option>
            </select>
          </label>
          <Field label="Başlık" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Field
            label="Kategori"
            placeholder="Örn. Yakıt, Motor Bakımı, Ek Gelir"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            hint="Kategoriyi ihtiyacınıza göre kendiniz belirleyebilirsiniz."
          />
          <Field label="Tutar (₺)" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Field label="Tarih" type="date" required value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} />
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
