import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminMarketingApi, type VisitFilters } from '../../lib/marketingApi';
import { usersApi } from '../../lib/adminApi';
import { formatDateTR } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import type { AdminUser, MarketingVisit, VisitResult } from '../../types';

export default function MarketingVisitsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const [rows, setRows] = useState<MarketingVisit[]>([]);
  const [marketers, setMarketers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VisitFilters>({});

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminMarketingApi.list(filters));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    usersApi.list().then((all) => setMarketers(all.filter((u) => u.role === 'PAZARLAMACI'))).catch(() => setMarketers([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const remove = async (v: MarketingVisit) => {
    if (!confirm(`${v.marketerName} — ${v.placeName} kaydı silinsin mi?`)) return;
    try {
      await adminMarketingApi.remove(v.id);
      await load();
    } catch {
      alert('İşlem başarısız. Tekrar deneyin.');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Pazarlama Görüşme Kayıtları</h1>
        <p className="mt-1 text-sm text-muted">Tüm pazarlamacıların ziyaret sonuçları. Her satır ilgili pazarlamacıya aittir.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Pazarlamacı</span>
          <select value={filters.userId ?? ''} onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tümü</option>
            {marketers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Pazarlamacı</th>
                <th className="px-4 py-3 font-medium">Yer</th>
                <th className="px-4 py-3 font-medium">Sonuç</th>
                <th className="px-4 py-3 font-medium">Detay</th>
                <th className="px-4 py-3 font-medium">Not</th>
                {canManage && <th className="px-4 py-3 text-right font-medium">İşlemler</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Yükleniyor...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Kayıt bulunamadı.</td></tr>
              ) : rows.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{formatDateTR(v.visitDate)}</td>
                  <td className="px-4 py-3 text-text">{v.marketerName}</td>
                  <td className="px-4 py-3 text-text">
                    {v.placeName}
                    {(v.contactName || v.phone) && (
                      <div className="text-xs text-muted">{[v.contactName, v.phone].filter(Boolean).join(' · ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.result === 'POSITIVE' ? (
                      <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">Olumlu</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">Olumsuz</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text">{v.result === 'POSITIVE' ? `${v.operationSize} kişilik operasyon` : v.negativeReason}</td>
                  <td className="px-4 py-3 text-muted">{v.note ?? '—'}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(v)} className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white hover:bg-danger/90">Sil</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
