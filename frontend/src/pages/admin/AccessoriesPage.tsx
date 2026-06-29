import { useEffect, useState, type FormEvent } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/Modal';
import Field from '../../components/admin/Field';
import MoneyField from '../../components/admin/MoneyField';
import StatCard from '../../components/StatCard';
import {
  AccessoryTypeBadge,
  ACCESSORY_TYPE_LABEL,
  ACCESSORY_TYPE_OPTIONS,
} from '../../components/admin/StockBadges';
import { accessoriesApi } from '../../lib/stockApi';
import { formatTL, formatDateTR } from '../../lib/format';
import type {
  AccessoryPurchase,
  AccessorySale,
  AccessorySummary,
  AccessoryType,
} from '../../types';
import { extractError } from './AdvancesPage';
import { useAuth } from '../../context/AuthContext';
import { canEditFinance } from '../../lib/permissions';

const today = () => new Date().toISOString().slice(0, 10);

type Tab = 'purchases' | 'sales';

const emptyPurchase = {
  type: 'BAG' as AccessoryType,
  name: '',
  quantity: '1',
  unitCost: '',
  purchaseDate: today(),
};
const emptySale = {
  type: 'BAG' as AccessoryType,
  name: '',
  quantity: '1',
  unitPrice: '',
  unitCost: '',
  saleDate: today(),
  buyer: '',
  note: '',
};

export default function AccessoriesPage() {
  const { user } = useAuth();
  const canEdit = canEditFinance(user);
  const [tab, setTab] = useState<Tab>('purchases');
  const [summary, setSummary] = useState<AccessorySummary | null>(null);
  const [purchases, setPurchases] = useState<AccessoryPurchase[]>([]);
  const [sales, setSales] = useState<AccessorySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', dateFrom: '', dateTo: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [sum, p, s] = await Promise.all([
        accessoriesApi.summary(filters),
        accessoriesApi.listPurchases(filters),
        accessoriesApi.listSales(filters),
      ]);
      setSummary(sum);
      setPurchases(p);
      setSales(s);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Aksesuarlar</h1>
        <p className="mt-1 text-sm text-muted">Çanta ve göğüs çantası alış-satış takibi ve kâr hesabı.</p>
      </div>

      {summary && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Satış Geliri" value={formatTL(summary.totals.revenue)} />
            <StatCard label="Satış Maliyeti" value={formatTL(summary.totals.cost)} />
            <StatCard label="Satış Kârı" value={formatTL(summary.totals.profit)} accent />
            <StatCard label="Stokta (adet)" value={String(summary.totals.onHandQty)} />
          </div>

          {/* Per-type stock on hand */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summary.byType.map((t) => (
              <div key={t.type} className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
                <p className="text-sm font-semibold text-text">{ACCESSORY_TYPE_LABEL[t.type]}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{t.onHandQty} <span className="text-sm font-normal text-muted">adet stokta</span></p>
                <p className="mt-1 text-xs text-muted">Alınan {t.purchasedQty} · Satılan {t.soldQty} · Kâr {formatTL(t.profit)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Date / type filters (apply to lists + profit figures) */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <Filter label="Tür">
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tümü</option>
            {ACCESSORY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Filter>
        <Filter label="Başlangıç"><input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Filter>
        <Filter label="Bitiş"><input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Filter>
        <div className="flex flex-1 items-end justify-end">
          <button onClick={() => setFilters({ type: '', dateFrom: '', dateTo: '' })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-text hover:bg-slate-100">Temizle</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-card p-1 shadow-sm">
          <TabButton active={tab === 'purchases'} onClick={() => setTab('purchases')}>Alışlar</TabButton>
          <TabButton active={tab === 'sales'} onClick={() => setTab('sales')}>Satışlar</TabButton>
        </div>
      </div>

      {tab === 'purchases' ? (
        <PurchasesPanel rows={purchases} loading={loading} canEdit={canEdit} reload={load} />
      ) : (
        <SalesPanel rows={sales} loading={loading} canEdit={canEdit} reload={load} summary={summary} />
      )}
    </AdminLayout>
  );
}

// ---------------- Purchases panel ----------------
function PurchasesPanel({ rows, loading, canEdit, reload }: { rows: AccessoryPurchase[]; loading: boolean; canEdit: boolean; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccessoryPurchase | null>(null);
  const [form, setForm] = useState(emptyPurchase);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm(emptyPurchase); setError(null); setOpen(true); };
  const openEdit = (p: AccessoryPurchase) => {
    setEditing(p);
    setForm({ type: p.type, name: p.name ?? '', quantity: String(p.quantity), unitCost: p.unitCost, purchaseDate: p.purchaseDate });
    setError(null); setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setSaving(true);
    try {
      const payload = { type: form.type, name: form.name, quantity: Number(form.quantity), unitCost: Number(form.unitCost), purchaseDate: form.purchaseDate };
      if (editing) await accessoriesApi.updatePurchase(editing.id, payload);
      else await accessoriesApi.createPurchase(payload);
      setOpen(false); await reload();
    } catch (err) { setError(extractError(err)); } finally { setSaving(false); }
  };
  const remove = async (p: AccessoryPurchase) => {
    if (!confirm('Bu alış kaydını silmek istiyor musunuz?')) return;
    try { await accessoriesApi.removePurchase(p.id); await reload(); } catch (err) { alert(extractError(err)); }
  };

  return (
    <>
      {canEdit && (
        <div className="mb-3 flex justify-end">
          <button onClick={openCreate} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">+ Yeni Alış</button>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Ürün</th>
                <th className="px-4 py-3 font-medium">Adet</th>
                <th className="px-4 py-3 font-medium">Birim Alış</th>
                <th className="px-4 py-3 font-medium">Toplam</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Kayıt bulunamadı.</td></tr>
              ) : rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{formatDateTR(p.purchaseDate)}</td>
                  <td className="px-4 py-3"><AccessoryTypeBadge type={p.type} /></td>
                  <td className="px-4 py-3 text-text">{p.name || '—'}</td>
                  <td className="px-4 py-3 text-text">{p.quantity}</td>
                  <td className="px-4 py-3 text-text">{formatTL(p.unitCost)}</td>
                  <td className="px-4 py-3 font-medium text-text">{formatTL(p.totalCost)}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-text hover:bg-slate-100">Düzenle</button>
                        <button onClick={() => remove(p)} className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white hover:bg-danger/90">Sil</button>
                      </div>
                    ) : <span className="block text-right text-xs text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={editing ? 'Alış Düzenle' : 'Yeni Aksesuar Alışı'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Tür</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccessoryType })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {ACCESSORY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <Field label="Ürün Adı (opsiyonel)" placeholder="Örn. Kırmızı termal çanta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Adet" type="number" min="1" step="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <MoneyField label="Birim Alış" required value={form.unitCost} onChange={(v) => setForm({ ...form, unitCost: v })} />
          </div>
          <Field label="Alış Tarihi" type="date" required value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">İptal</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ---------------- Sales panel ----------------
function SalesPanel({ rows, loading, canEdit, reload, summary }: { rows: AccessorySale[]; loading: boolean; canEdit: boolean; reload: () => Promise<void>; summary: AccessorySummary | null }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccessorySale | null>(null);
  const [form, setForm] = useState(emptySale);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm(emptySale); setError(null); setOpen(true); };
  const openEdit = (s: AccessorySale) => {
    setEditing(s);
    setForm({ type: s.type, name: s.name ?? '', quantity: String(s.quantity), unitPrice: s.unitPrice, unitCost: s.unitCost, saleDate: s.saleDate, buyer: s.buyer ?? '', note: s.note ?? '' });
    setError(null); setOpen(true);
  };

  // Stock on hand for the selected type. When editing, the row's own quantity is
  // already counted in `soldQty`, so add it back to get the true sellable amount.
  const typeRow = summary?.byType.find((t) => t.type === form.type);
  const available = (typeRow?.onHandQty ?? 0) + (editing && editing.type === form.type ? editing.quantity : 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (Number(form.quantity) > available) {
      setError(`Yetersiz stok. Bu türde satılabilir ${available} adet var.`);
      return;
    }
    setSaving(true);
    try {
      const payload = { type: form.type, name: form.name, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), unitCost: Number(form.unitCost), saleDate: form.saleDate, buyer: form.buyer, note: form.note };
      if (editing) await accessoriesApi.updateSale(editing.id, payload);
      else await accessoriesApi.createSale(payload);
      setOpen(false); await reload();
    } catch (err) { setError(extractError(err)); } finally { setSaving(false); }
  };
  const remove = async (s: AccessorySale) => {
    if (!confirm('Bu satış kaydını silmek istiyor musunuz?')) return;
    try { await accessoriesApi.removeSale(s.id); await reload(); } catch (err) { alert(extractError(err)); }
  };

  // Live profit preview in the form.
  const previewProfit = (Number(form.unitPrice) - Number(form.unitCost)) * Number(form.quantity);
  const previewValid = form.unitPrice !== '' && form.unitCost !== '' && form.quantity !== '';
  const overStock = form.quantity !== '' && Number(form.quantity) > available;

  return (
    <>
      {canEdit && (
        <div className="mb-3 flex justify-end">
          <button onClick={openCreate} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">+ Yeni Satış</button>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Ürün</th>
                <th className="px-4 py-3 font-medium">Adet</th>
                <th className="px-4 py-3 font-medium">Birim Satış</th>
                <th className="px-4 py-3 font-medium">Birim Alış</th>
                <th className="px-4 py-3 font-medium">Gelir</th>
                <th className="px-4 py-3 font-medium">Kâr</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Kayıt bulunamadı.</td></tr>
              ) : rows.map((s) => {
                const profit = Number(s.profit);
                return (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{formatDateTR(s.saleDate)}</td>
                    <td className="px-4 py-3"><AccessoryTypeBadge type={s.type} /></td>
                    <td className="px-4 py-3 text-text">{s.name || '—'}</td>
                    <td className="px-4 py-3 text-text">{s.quantity}</td>
                    <td className="px-4 py-3 text-text">{formatTL(s.unitPrice)}</td>
                    <td className="px-4 py-3 text-muted">{formatTL(s.unitCost)}</td>
                    <td className="px-4 py-3 text-text">{formatTL(s.totalRevenue)}</td>
                    <td className="px-4 py-3"><span className={`font-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatTL(s.profit)}</span></td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(s)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-text hover:bg-slate-100">Düzenle</button>
                          <button onClick={() => remove(s)} className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white hover:bg-danger/90">Sil</button>
                        </div>
                      ) : <span className="block text-right text-xs text-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title={editing ? 'Satış Düzenle' : 'Yeni Aksesuar Satışı'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Tür</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccessoryType })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {ACCESSORY_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="mt-1 block text-xs text-muted">Bu türde stokta <strong>{available}</strong> adet var. Satış stoktan düşülür.</span>
          </label>
          <Field label="Ürün Adı (opsiyonel)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Adet" type="number" min="1" step="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <MoneyField label="Birim Satış" required value={form.unitPrice} onChange={(v) => setForm({ ...form, unitPrice: v })} />
            <MoneyField label="Birim Alış" required value={form.unitCost} onChange={(v) => setForm({ ...form, unitCost: v })} />
          </div>
          {overStock && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">Yetersiz stok: en fazla {available} adet satılabilir.</div>
          )}
          {previewValid && !overStock && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="text-muted">Hesaplanan kâr: </span>
              <span className={`font-semibold ${previewProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatTL(previewProfit)}</span>
            </div>
          )}
          <Field label="Satış Tarihi" type="date" required value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
          <Field label="Alıcı (opsiyonel)" value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} />
          <Field label="Not" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">İptal</button>
            <button type="submit" disabled={saving || overStock} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${active ? 'bg-accent text-white' : 'text-text hover:bg-slate-100'}`}>
      {children}
    </button>
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
