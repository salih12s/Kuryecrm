import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/Modal';
import Field from '../../components/admin/Field';
import { StatusPill } from '../../components/admin/FinanceBadges';
import { couriersApi } from '../../lib/adminApi';
import { accountsApi, courierPaymentsApi } from '../../lib/financeApi';
import { formatDateTR, formatTL } from '../../lib/format';
import type { AdminCourier, CourierAccountSummary, CourierPayment } from '../../types';
import { extractError } from './AdvancesPage';
import { useAuth } from '../../context/AuthContext';
import { canEditFinance } from '../../lib/permissions';

const today = () => new Date().toLocaleDateString('sv-SE');

export default function CourierPaymentsPage() {
  const { user } = useAuth();
  const canEdit = canEditFinance(user);
  const [searchParams] = useSearchParams();
  const initialCourierId = searchParams.get('courierId') ?? '';
  const [rows, setRows] = useState<CourierPayment[]>([]);
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ courierId: initialCourierId, dateFrom: '', dateTo: '', status: '' });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CourierPayment | null>(null);
  const [form, setForm] = useState({ courierId: initialCourierId, amount: '', paymentDate: today(), method: '', note: '' });
  const [account, setAccount] = useState<CourierAccountSummary | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await courierPaymentsApi.list(filters)); }
    catch { setRows([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    couriersApi.list({ status: 'active' }).then(setCouriers).catch(() => setCouriers([]));
    if (initialCourierId) setOpen(true);
  }, [initialCourierId]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!open || !form.courierId) { setAccount(null); return; }
    setAccountLoading(true);
    accountsApi.courierSummary(form.courierId)
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => setAccountLoading(false));
  }, [open, form.courierId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ courierId: filters.courierId, amount: '', paymentDate: today(), method: '', note: '' });
    setError(null);
    setOpen(true);
  };

  const openEdit = (payment: CourierPayment) => {
    setEditing(payment);
    setForm({ courierId: payment.courierId, amount: payment.amount, paymentDate: payment.paymentDate, method: payment.method ?? '', note: payment.note ?? '' });
    setError(null);
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload = { amount: Number(form.amount), paymentDate: form.paymentDate, method: form.method, note: form.note };
      if (editing) await courierPaymentsApi.update(editing.id, payload);
      else await courierPaymentsApi.create({ ...payload, courierId: form.courierId });
      setOpen(false);
      await load();
    } catch (err) { setError(extractError(err)); }
    finally { setSaving(false); }
  };

  const toggle = async (payment: CourierPayment) => {
    try {
      await courierPaymentsApi.setStatus(payment.id, payment.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE');
      await load();
    } catch (err) { alert(extractError(err)); }
  };

  const enteredAmount = Number(form.amount || 0);
  const oldActiveAmount = editing?.status === 'ACTIVE' ? Number(editing.amount) : 0;
  const availableBeforeThisPayment = account ? account.remainingPayable + oldActiveAmount : 0;
  const projectedRemaining = availableBeforeThisPayment - enteredAmount;

  return <AdminLayout>
    <div className="mb-6"><h1 className="text-2xl font-bold text-primary">Kurye Ödemeleri</h1><p className="mt-1 text-sm text-muted">Kuryelerin kalan hak edişlerini ödeyin ve ödeme geçmişini yönetin.</p></div>
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <Filter label="Kurye"><select value={filters.courierId} onChange={(e) => setFilters({ ...filters, courierId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Tümü</option>{couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Filter>
      <Filter label="Başlangıç"><input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Filter>
      <Filter label="Bitiş"><input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></Filter>
      <Filter label="Durum"><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Tümü</option><option value="ACTIVE">Aktif</option><option value="CANCELLED">İptal</option></select></Filter>
      {canEdit && <button onClick={openCreate} className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">+ Ödeme Yap</button>}
    </div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-muted">{['Tarih','Kurye','Tutar','Yöntem','Not','Durum','İşlemler'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Ödeme kaydı yok.</td></tr> : rows.map((payment) => <tr key={payment.id} className="border-t"><td className="px-4 py-3">{formatDateTR(payment.paymentDate)}</td><td className="px-4">{payment.courierName}</td><td className="px-4">{formatTL(payment.amount)}</td><td className="px-4">{payment.method ?? '—'}</td><td className="px-4">{payment.note ?? '—'}</td><td className="px-4"><StatusPill status={payment.status} /></td><td className="px-4"><div className="flex gap-2">{canEdit && <><button onClick={() => openEdit(payment)} className="rounded-md border px-2.5 py-1 text-xs">Düzenle</button><button onClick={() => toggle(payment)} className={`rounded-md px-2.5 py-1 text-xs text-white ${payment.status === 'ACTIVE' ? 'bg-danger' : 'bg-success'}`}>{payment.status === 'ACTIVE' ? 'İptal Et' : 'Aktif Et'}</button></>}<Link to={`/admin/couriers/${payment.courierId}/account`} className="rounded-md border px-2.5 py-1 text-xs">Hesap</Link></div></td></tr>)}
    </tbody></table></div>

    <Modal open={open} title={editing ? 'Kurye Ödemesini Düzenle' : 'Kurye Ödemesi Yap'} onClose={() => setOpen(false)}>
      <form onSubmit={submit} className="space-y-4">{error && <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>}
        {!editing && <label className="block"><span className="mb-1 block text-sm font-medium">Kurye</span><select required value={form.courierId} onChange={(e) => setForm({ ...form, courierId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Seçiniz</option>{couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        {accountLoading && <p className="text-sm text-muted">Hesap bilgisi yükleniyor...</p>}
        {account && <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm"><div><span className="block text-xs text-muted">Toplam Hak Ediş</span><b>{formatTL(account.totalEarnings)}</b></div><div><span className="block text-xs text-muted">Aktif Avans</span><b>{formatTL(account.totalActiveAdvances)}</b></div><div><span className="block text-xs text-muted">Daha Önce Ödenen</span><b>{formatTL(account.totalActivePayments)}</b></div><div><span className="block text-xs text-muted">Ödenebilir Tutar</span><b>{formatTL(availableBeforeThisPayment)}</b></div><div className="col-span-2"><span className="block text-xs text-muted">Bu Ödeme Sonrası Kalan</span><b className={projectedRemaining < 0 ? 'text-danger' : 'text-success'}>{formatTL(projectedRemaining)}</b></div></div>}
        <Field label="Tutar (₺)" type="number" min="0.01" max={availableBeforeThisPayment > 0 ? availableBeforeThisPayment : undefined} step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Field label="Ödeme Tarihi" type="date" required value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
        <Field label="Ödeme Yöntemi" placeholder="Havale, nakit..." value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} />
        <Field label="Not" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">İptal</button><button disabled={saving || !account || enteredAmount <= 0 || projectedRemaining < 0} className="rounded-lg bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button></div>
      </form>
    </Modal>
  </AdminLayout>;
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-xs font-medium text-muted">{label}</span>{children}</label>;
}
