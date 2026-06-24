import { useEffect, useState, type FormEvent } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/Modal';
import Field from '../../components/admin/Field';
import StatCard from '../../components/StatCard';
import { InvoiceStatusBadge, StatusPill } from '../../components/admin/FinanceBadges';
import { accountsApi, invoicesApi, paymentsApi } from '../../lib/financeApi';
import { formatTL, formatDateTR } from '../../lib/format';
import type { RestaurantAccountListItem, RestaurantAccountSummary } from '../../types';
import { extractError } from './AdvancesPage';

const today = () => new Date().toISOString().slice(0, 10);

export default function RestaurantAccountsPage() {
  const [list, setList] = useState<RestaurantAccountListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RestaurantAccountSummary | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const [invoiceModal, setInvoiceModal] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNo: '', invoiceDate: today(), periodStart: '', periodEnd: '', amount: '', note: '' });

  const [paymentModal, setPaymentModal] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ invoiceId: '', paymentDate: today(), amount: '', method: '', note: '' });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadList = async () => {
    setLoadingList(true);
    try {
      setList(await accountsApi.restaurantAccounts());
    } finally {
      setLoadingList(false);
    }
  };
  const loadDetail = async (id: string) => {
    setDetail(await accountsApi.restaurantSummary(id));
  };

  useEffect(() => {
    loadList();
  }, []);

  const select = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    await loadDetail(id);
  };

  const refresh = async () => {
    await loadList();
    if (selectedId) await loadDetail(selectedId);
  };

  // ---- invoice ----
  const openInvoiceCreate = () => {
    setEditInvoiceId(null);
    setInvoiceForm({ invoiceNo: '', invoiceDate: today(), periodStart: '', periodEnd: '', amount: '', note: '' });
    setError(null);
    setInvoiceModal(true);
  };
  const openInvoiceEdit = (inv: RestaurantAccountSummary['invoices'][number]) => {
    setEditInvoiceId(inv.id);
    setInvoiceForm({
      invoiceNo: inv.invoiceNo ?? '',
      invoiceDate: inv.invoiceDate,
      periodStart: inv.periodStart ?? '',
      periodEnd: inv.periodEnd ?? '',
      amount: inv.amount,
      note: inv.note ?? '',
    });
    setError(null);
    setInvoiceModal(true);
  };
  const submitInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setSaving(true);
    try {
      const payload = { ...invoiceForm, amount: Number(invoiceForm.amount) };
      if (editInvoiceId) await invoicesApi.update(editInvoiceId, payload);
      else await invoicesApi.create({ ...payload, restaurantId: selectedId });
      setInvoiceModal(false);
      await refresh();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };
  const cancelInvoice = async (id: string) => {
    if (!confirm('Fatura iptal edilsin mi?')) return;
    await invoicesApi.setStatus(id, 'CANCELLED');
    await refresh();
  };

  // ---- payment ----
  const openPaymentCreate = () => {
    setEditPaymentId(null);
    setPaymentForm({ invoiceId: '', paymentDate: today(), amount: '', method: '', note: '' });
    setError(null);
    setPaymentModal(true);
  };
  const openPaymentEdit = (p: RestaurantAccountSummary['payments'][number]) => {
    setEditPaymentId(p.id);
    setPaymentForm({
      invoiceId: p.invoiceId ?? '',
      paymentDate: p.paymentDate,
      amount: p.amount,
      method: p.method ?? '',
      note: p.note ?? '',
    });
    setError(null);
    setPaymentModal(true);
  };
  const submitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setSaving(true);
    try {
      const payload = { ...paymentForm, amount: Number(paymentForm.amount) };
      if (editPaymentId) await paymentsApi.update(editPaymentId, payload);
      else await paymentsApi.create({ ...payload, restaurantId: selectedId });
      setPaymentModal(false);
      await refresh();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSaving(false);
    }
  };
  const cancelPayment = async (id: string) => {
    if (!confirm('Ödeme iptal edilsin mi?')) return;
    await paymentsApi.setStatus(id, 'CANCELLED');
    await refresh();
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Restoran Cari</h1>
        <p className="mt-1 text-sm text-muted">Fatura ve ödemeleri yönetin, kalan bakiyeyi takip edin.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Restoran</th>
                <th className="px-4 py-3 font-medium">Toplam Fatura</th>
                <th className="px-4 py-3 font-medium">Toplam Ödeme</th>
                <th className="px-4 py-3 font-medium">Kalan Bakiye</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Restoran bulunamadı.</td></tr>
              ) : list.map((r) => (
                <tr key={r.id} className={`border-b border-slate-100 last:border-0 ${selectedId === r.id ? 'bg-accent/5' : ''}`}>
                  <td className="px-4 py-3 font-medium text-text">{r.name}</td>
                  <td className="px-4 py-3 text-text">{formatTL(r.totalInvoiced)}</td>
                  <td className="px-4 py-3 text-text">{formatTL(r.totalPaid)}</td>
                  <td className={`px-4 py-3 font-semibold ${r.remainingBalance > 0 ? 'text-danger' : 'text-success'}`}>{formatTL(r.remainingBalance)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${r.remainingBalance > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                      {r.remainingBalance > 0 ? 'Borçlu' : 'Kapalı'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => select(r.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-text hover:bg-slate-100">Detay</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail */}
      {selectedId && (
        <div className="mt-6 space-y-6">
          {!detail ? (
            <p className="text-sm text-muted">Detay yükleniyor...</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-primary">{detail.restaurant.name} — Cari Detay</h2>
                <div className="flex gap-2">
                  <button onClick={openInvoiceCreate} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90">+ Fatura Ekle</button>
                  <button onClick={openPaymentCreate} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent/90">+ Ödeme Ekle</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Hizmet Bedeli (onaylı vardiya)" value={formatTL(detail.totalServiceAmount)} />
                <StatCard label="Toplam Fatura" value={formatTL(detail.totalInvoiced)} />
                <StatCard label="Toplam Ödeme" value={formatTL(detail.totalPaid)} />
                <StatCard label="Kalan Bakiye" value={formatTL(detail.remainingBalance)} accent />
              </div>

              {/* Invoices */}
              <Section title="Faturalar">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                    <th className="px-4 py-2 font-medium">Tarih</th><th className="px-4 py-2 font-medium">Fatura No</th><th className="px-4 py-2 font-medium">Tutar</th><th className="px-4 py-2 font-medium">Durum</th><th className="px-4 py-2 text-right font-medium">İşlemler</th>
                  </tr></thead>
                  <tbody>
                    {detail.invoices.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Fatura yok.</td></tr>
                    ) : detail.invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2 text-text">{formatDateTR(inv.invoiceDate)}</td>
                        <td className="px-4 py-2 text-muted">{inv.invoiceNo ?? '—'}</td>
                        <td className="px-4 py-2 text-text">{formatTL(inv.amount)}</td>
                        <td className="px-4 py-2"><InvoiceStatusBadge status={inv.status} /></td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openInvoiceEdit(inv)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-text hover:bg-slate-100">Düzenle</button>
                            {inv.status !== 'CANCELLED' && <button onClick={() => cancelInvoice(inv.id)} className="rounded-md bg-danger px-2.5 py-1 text-xs text-white hover:bg-danger/90">İptal</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              {/* Payments */}
              <Section title="Ödemeler">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                    <th className="px-4 py-2 font-medium">Tarih</th><th className="px-4 py-2 font-medium">Tutar</th><th className="px-4 py-2 font-medium">Yöntem</th><th className="px-4 py-2 font-medium">Durum</th><th className="px-4 py-2 text-right font-medium">İşlemler</th>
                  </tr></thead>
                  <tbody>
                    {detail.payments.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Ödeme yok.</td></tr>
                    ) : detail.payments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2 text-text">{formatDateTR(p.paymentDate)}</td>
                        <td className="px-4 py-2 text-text">{formatTL(p.amount)}</td>
                        <td className="px-4 py-2 text-muted">{p.method ?? '—'}</td>
                        <td className="px-4 py-2"><StatusPill status={p.status} /></td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openPaymentEdit(p)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-text hover:bg-slate-100">Düzenle</button>
                            {p.status !== 'CANCELLED' && <button onClick={() => cancelPayment(p.id)} className="rounded-md bg-danger px-2.5 py-1 text-xs text-white hover:bg-danger/90">İptal</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              {/* Approved shifts */}
              <Section title="İlgili Onaylı Vardiyalar">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                    <th className="px-4 py-2 font-medium">Tarih</th><th className="px-4 py-2 font-medium">Kurye</th><th className="px-4 py-2 font-medium">Saat</th><th className="px-4 py-2 font-medium">Hizmet Bedeli</th>
                  </tr></thead>
                  <tbody>
                    {detail.shifts.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Onaylı vardiya yok.</td></tr>
                    ) : detail.shifts.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2 text-text">{formatDateTR(s.date)}</td>
                        <td className="px-4 py-2 text-muted">{s.courierName}</td>
                        <td className="px-4 py-2 text-muted">{s.workHours} sa</td>
                        <td className="px-4 py-2 text-text">{formatTL(s.serviceAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            </>
          )}
        </div>
      )}

      {/* Invoice modal */}
      <Modal open={invoiceModal} title={editInvoiceId ? 'Fatura Düzenle' : 'Yeni Fatura'} onClose={() => setInvoiceModal(false)}>
        <form onSubmit={submitInvoice} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fatura No" value={invoiceForm.invoiceNo} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })} />
            <Field label="Fatura Tarihi" type="date" required value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} />
            <Field label="Dönem Başlangıç" type="date" value={invoiceForm.periodStart} onChange={(e) => setInvoiceForm({ ...invoiceForm, periodStart: e.target.value })} />
            <Field label="Dönem Bitiş" type="date" value={invoiceForm.periodEnd} onChange={(e) => setInvoiceForm({ ...invoiceForm, periodEnd: e.target.value })} />
          </div>
          <Field label="Tutar (₺)" type="number" min="0" step="0.01" required value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
          <Field label="Not" value={invoiceForm.note} onChange={(e) => setInvoiceForm({ ...invoiceForm, note: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setInvoiceModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">İptal</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>

      {/* Payment modal */}
      <Modal open={paymentModal} title={editPaymentId ? 'Ödeme Düzenle' : 'Yeni Ödeme'} onClose={() => setPaymentModal(false)}>
        <form onSubmit={submitPayment} className="space-y-4">
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Fatura (opsiyonel)</span>
            <select value={paymentForm.invoiceId} onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Faturasız ödeme</option>
              {detail?.invoices.filter((i) => i.status !== 'CANCELLED').map((i) => (
                <option key={i.id} value={i.id}>{(i.invoiceNo ?? 'Fatura') + ' — ' + formatTL(i.amount)}</option>
              ))}
            </select>
          </label>
          <Field label="Tutar (₺)" type="number" min="0" step="0.01" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          <Field label="Ödeme Tarihi" type="date" required value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
          <Field label="Yöntem" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} />
          <Field label="Not" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPaymentModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100">İptal</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 font-semibold text-text">{title}</div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
