import { useEffect, useState, type FormEvent } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/Modal';
import Field from '../../components/admin/Field';
import MoneyField from '../../components/admin/MoneyField';
import StatCard from '../../components/StatCard';
import { MotorcycleStatusBadge, MOTOR_STATUS_OPTIONS } from '../../components/admin/StockBadges';
import { motorcyclesApi } from '../../lib/stockApi';
import { couriersApi } from '../../lib/adminApi';
import { formatTL, formatDateTR } from '../../lib/format';
import type { AdminCourier, Motorcycle, MotorcycleStatus, MotorcycleSummary } from '../../types';
import { extractError } from './AdvancesPage';
import { useAuth } from '../../context/AuthContext';
import { canEditFinance } from '../../lib/permissions';

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  brand: '',
  plate: '',
  purchaseDate: today(),
  purchasePrice: '',
  status: 'IN_STOCK' as MotorcycleStatus,
  saleDate: '',
  salePrice: '',
};

export default function MotorcyclesPage() {
  const { user } = useAuth();
  const canEdit = canEditFinance(user);
  const [rows, setRows] = useState<Motorcycle[]>([]);
  const [summary, setSummary] = useState<MotorcycleSummary | null>(null);
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Motorcycle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dedicated "sell this motorcycle" dialog.
  const [sellTarget, setSellTarget] = useState<Motorcycle | null>(null);
  const [sellForm, setSellForm] = useState({ saleDate: today(), salePrice: '', buyer: '', buyerCourierId: '' });
  const [sellError, setSellError] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        motorcyclesApi.list(filters),
        motorcyclesApi.summary(),
      ]);
      setRows(list);
      setSummary(sum);
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  };
  const openEdit = (m: Motorcycle) => {
    setEditing(m);
    setForm({
      brand: m.brand,
      plate: m.plate ?? '',
      purchaseDate: m.purchaseDate,
      purchasePrice: m.purchasePrice,
      status: m.status,
      saleDate: m.saleDate ?? '',
      salePrice: m.salePrice ?? '',
    });
    setError(null);
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const isSold = form.status === 'SOLD';
    if (isSold && (!form.salePrice || !form.saleDate)) {
      setError('Satıldı durumunda satış fiyatı ve satış tarihi zorunludur.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        brand: form.brand,
        plate: form.plate,
        purchaseDate: form.purchaseDate,
        purchasePrice: Number(form.purchasePrice),
        status: form.status,
        // Clear sale fields unless the bike is marked sold.
        saleDate: isSold ? form.saleDate : '',
        salePrice: isSold ? Number(form.salePrice) : undefined,
      };
      if (editing) await motorcyclesApi.update(editing.id, payload);
      else await motorcyclesApi.create(payload);
      setOpen(false);
      await load();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: Motorcycle) => {
    if (!confirm(`"${m.brand}" motor kaydını silmek istiyor musunuz?`)) return;
    try {
      await motorcyclesApi.remove(m.id);
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  };

  const openSell = (m: Motorcycle) => {
    setSellTarget(m);
    setSellForm({ saleDate: today(), salePrice: '', buyer: m.buyer ?? '', buyerCourierId: m.buyerCourierId ?? '' });
    setSellError(null);
  };
  // Buyer is free text; if it exactly matches a courier name we auto-link that
  // courier so the sale price is charged against their earnings.
  const onSellBuyerChange = (value: string) => {
    const match = couriers.find((c) => c.name.trim() === value.trim());
    setSellForm((f) => ({ ...f, buyer: value, buyerCourierId: match?.id ?? '' }));
  };
  const submitSell = async (e: FormEvent) => {
    e.preventDefault();
    if (!sellTarget) return;
    setSellError(null);
    if (!sellForm.salePrice || !sellForm.saleDate) {
      setSellError('Satış fiyatı ve satış tarihi zorunludur.');
      return;
    }
    setSelling(true);
    try {
      await motorcyclesApi.update(sellTarget.id, {
        status: 'SOLD',
        saleDate: sellForm.saleDate,
        salePrice: Number(sellForm.salePrice),
        buyer: sellForm.buyer,
        // Send empty string to clear any prior link when no courier matches.
        buyerCourierId: sellForm.buyerCourierId,
      });
      setSellTarget(null);
      await load();
    } catch (err) {
      setSellError(extractError(err));
    } finally {
      setSelling(false);
    }
  };

  const isSold = form.status === 'SOLD';
  const sellProfit = sellTarget ? Number(sellForm.salePrice || 0) - Number(sellTarget.purchasePrice) : 0;
  const sellBuyerCourier = couriers.find((c) => c.id === sellForm.buyerCourierId);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Motorlar</h1>
        <p className="mt-1 text-sm text-muted">Satın alınan motorların stok kaydı ve satış takibi.</p>
      </div>

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Toplam Motor" value={String(summary.total)} />
          <StatCard label={`Stoktaki Değer (${summary.counts.IN_STOCK + summary.counts.ASSIGNED} adet)`} value={formatTL(summary.totalPurchaseValue)} />
          <StatCard label={`Satış Geliri (${summary.counts.SOLD} satıldı)`} value={formatTL(summary.totalSaleRevenue)} />
          <StatCard label="Satış Kârı" value={formatTL(summary.totalSaleProfit)} accent />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <Filter label="Durum">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tümü</option>
            {MOTOR_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Filter>
        <Filter label="Ara"><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Marka / plaka..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Filter>
        <div className="flex flex-1 items-end justify-end gap-2">
          <button onClick={() => setFilters({ status: '', search: '' })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-text hover:bg-slate-100">Temizle</button>
          {canEdit && (
            <button onClick={openCreate} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">+ Yeni Motor</button>
          )}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Yükleniyor...</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Kayıt bulunamadı.</p>
        ) : rows.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-text">{m.brand}</p>
                <p className="text-xs text-muted">{m.plate || 'Plakasız'} · Alış {formatDateTR(m.purchaseDate)}</p>
              </div>
              <MotorcycleStatusBadge status={m.status} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted">Alış:</span> <span className="font-medium text-text">{formatTL(m.purchasePrice)}</span></div>
              {m.status === 'SOLD' && m.salePrice && (
                <>
                  <div><span className="text-muted">Satış:</span> <span className="font-medium text-text">{formatTL(m.salePrice)}</span></div>
                  <div><span className="text-muted">Kâr:</span> <span className={`font-semibold ${(m.saleProfit ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>{formatTL(m.saleProfit ?? 0)}</span></div>
                  {(m.buyerCourierName || m.buyer) && (
                    <div className="col-span-2"><span className="text-muted">Alıcı:</span> <span className="font-medium text-text">{m.buyerCourierName || m.buyer}{m.buyerCourierName ? ' (kurye)' : ''}</span></div>
                  )}
                </>
              )}
            </div>
            {canEdit && (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.status !== 'SOLD' && (
                  <button onClick={() => openSell(m)} className="rounded-md bg-success px-2.5 py-1 text-xs font-medium text-white hover:bg-success/90">Sat</button>
                )}
                <button onClick={() => openEdit(m)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-text hover:bg-slate-100">Düzenle</button>
                <button onClick={() => remove(m)} className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white hover:bg-danger/90">Sil</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Marka / Model</th>
                <th className="px-4 py-3 font-medium">Plaka</th>
                <th className="px-4 py-3 font-medium">Alış Tarihi</th>
                <th className="px-4 py-3 font-medium">Alış</th>
                <th className="px-4 py-3 font-medium">Satış</th>
                <th className="px-4 py-3 font-medium">Kâr</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Kayıt bulunamadı.</td></tr>
              ) : rows.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{m.brand}</td>
                  <td className="px-4 py-3 text-muted">{m.plate || '—'}</td>
                  <td className="px-4 py-3 text-text">{formatDateTR(m.purchaseDate)}</td>
                  <td className="px-4 py-3 text-text">{formatTL(m.purchasePrice)}</td>
                  <td className="px-4 py-3 text-text">
                    {m.status === 'SOLD' && m.salePrice ? (
                      <div>
                        <div>{formatTL(m.salePrice)}</div>
                        {(m.buyerCourierName || m.buyer) && <div className="text-xs text-muted">{m.buyerCourierName || m.buyer}{m.buyerCourierName ? ' (kurye)' : ''}</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">{m.saleProfit != null ? <span className={`font-semibold ${m.saleProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatTL(m.saleProfit)}</span> : '—'}</td>
                  <td className="px-4 py-3"><MotorcycleStatusBadge status={m.status} /></td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <div className="flex justify-end gap-2">
                        {m.status !== 'SOLD' && (
                          <button onClick={() => openSell(m)} className="rounded-md bg-success px-2.5 py-1 text-xs font-medium text-white hover:bg-success/90">Sat</button>
                        )}
                        <button onClick={() => openEdit(m)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-text hover:bg-slate-100">Düzenle</button>
                        <button onClick={() => remove(m)} className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white hover:bg-danger/90">Sil</button>
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

      <Modal open={open} title={editing ? 'Motor Düzenle' : 'Yeni Motor'} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          <Field label="Marka / Model" required placeholder="Örn. Honda Activa" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <Field label="Plaka" placeholder="34 KRY 100" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Alış Tarihi" type="date" required value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            <MoneyField label="Alış Fiyatı" required value={form.purchasePrice} onChange={(v) => setForm({ ...form, purchasePrice: v })} />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Durum</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MotorcycleStatus })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {MOTOR_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          {isSold && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Field label="Satış Tarihi" type="date" required value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
              <MoneyField label="Satış Fiyatı" required value={form.salePrice} onChange={(v) => setForm({ ...form, salePrice: v })} />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">İptal</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>

      {/* Dedicated sale dialog for one motorcycle. */}
      <Modal open={!!sellTarget} title="Motor Sat" onClose={() => setSellTarget(null)}>
        {sellTarget && (
          <form onSubmit={submitSell} className="space-y-4">
            {sellError && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{sellError}</div>}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-text">{sellTarget.brand}</p>
              <p className="text-xs text-muted">{sellTarget.plate || 'Plakasız'} · Alış {formatTL(sellTarget.purchasePrice)} ({formatDateTR(sellTarget.purchaseDate)})</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Satış Tarihi" type="date" required value={sellForm.saleDate} onChange={(e) => setSellForm({ ...sellForm, saleDate: e.target.value })} />
              <MoneyField label="Satış Fiyatı" required value={sellForm.salePrice} onChange={(v) => setSellForm({ ...sellForm, salePrice: v })} />
            </div>
            {/* Buyer: free text, but matching a courier name auto-links them so the
                sale price is charged against the courier's earnings. */}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Alıcı (opsiyonel)</span>
              <input
                list="motorcycle-buyers"
                value={sellForm.buyer}
                onChange={(e) => onSellBuyerChange(e.target.value)}
                placeholder="Kurye seçin ya da serbest isim yazın"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <datalist id="motorcycle-buyers">
                {couriers.map((c) => <option key={c.id} value={c.name}>Kurye</option>)}
              </datalist>
            </label>
            {sellForm.salePrice !== '' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-muted">Satış kârı: </span>
                <span className={`font-semibold ${sellProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatTL(sellProfit)}</span>
              </div>
            )}
            {sellBuyerCourier ? (
              sellForm.salePrice !== '' && (
                <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text">
                  <strong>{sellBuyerCourier.name}</strong> kuryesinin hak edişinden <strong>{formatTL(sellForm.salePrice)}</strong> düşülecek.
                </div>
              )
            ) : sellForm.buyer.trim() !== '' && (
              <p className="text-xs text-muted">Bu isim kayıtlı bir kuryeyle eşleşmiyor; sadece alıcı adı olarak kaydedilecek (hak edişe dokunulmaz).</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSellTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">İptal</button>
              <button type="submit" disabled={selling} className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-60">{selling ? 'Kaydediliyor...' : 'Satışı Tamamla'}</button>
            </div>
          </form>
        )}
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
