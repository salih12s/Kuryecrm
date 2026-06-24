import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import StatCard from '../components/StatCard';
import { formatTL } from '../lib/format';
import { reportsApi } from '../lib/reportsApi';
import type { DashboardReport } from '../types';

export default function AdminPage() {
  const [data, setData] = useState<DashboardReport | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { reportsApi.dashboard().then(setData).catch(() => setError('Genel bakış verileri yüklenemedi.')); }, []);
  return <AdminLayout>
    <div className="mb-5"><h1 className="text-2xl font-bold text-primary">Genel Bakış</h1><p className="mt-1 text-sm text-muted">Bugün ne yapmak istiyorsunuz?</p></div>
    <section className="mb-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['Vardiya Planla', 'Vardiya ekle, düzenle ve onayla', '/admin/shifts', '🗓️'],
          ['Canlı Haritayı Aç', 'Kuryeleri ve restoranları gör', '/admin/live-map', '📍'],
          ['Restoran Ekle', 'Restoran ve sabit konumunu tanımla', '/admin/restaurants', '🏪'],
          ['Kurye Ekle', 'Yeni kurye hesabı oluştur', '/admin/couriers', '🛵'],
          ['Kurye Ödemesi', 'Hak ediş ve ödeme kaydı', '/admin/courier-payments', '💳'],
          ['Gün Sonu', 'Bugünün kısa operasyon özeti', '/admin/reports/daily', '📊'],
        ].map(([title, description, to, icon]) => (
          <Link key={to} to={to} className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-xl" aria-hidden="true">{icon}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between font-semibold text-text group-hover:text-accent">{title}<span aria-hidden="true">→</span></span>
              <span className="mt-0.5 block text-xs text-muted">{description}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
    {error && <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>}
    {!data && !error && <p className="py-12 text-center text-muted">Genel bakış yükleniyor...</p>}
    {data && <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Bugünün Kısa Özeti</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Bugünkü Çalışma Saati" value={`${data.totalWorkHours} sa`} />
          <StatCard label="Operasyonel Net Kâr" value={formatTL(data.operationalNetProfit)} accent />
          <StatCard label="Kurye Kalan Ödeme" value={formatTL(data.totalCourierRemainingPayable)} />
          <StatCard label="Bekleyen / Uyuşmaz Vardiya" value={data.pendingShiftCount} />
        </div>
      </div>

      <SummaryTable
        title="Kuryeler — Çalışma ve Kazanç"
        hint="Tüm onaylı vardiyalar toplamı."
        head={['Kurye', 'Çalışma', 'Kazanç', 'Kalan Ödeme']}
        rows={data.couriers}
        empty="Kurye yok."
        render={(c) => (
          <tr key={c.courierId} className="border-b border-slate-100 last:border-0">
            <td className="px-4 py-2 font-medium text-text">{c.courierName}</td>
            <td className="px-4 py-2 text-muted">{c.workHours} sa</td>
            <td className="px-4 py-2 text-text">{formatTL(c.earnings)}</td>
            <td className={`px-4 py-2 font-semibold ${c.remainingPayable > 0 ? 'text-danger' : 'text-success'}`}>{formatTL(c.remainingPayable)}</td>
          </tr>
        )}
      />

      <SummaryTable
        title="Restoranlar — Ödenmesi Gereken"
        hint="Hizmet bedeli eksi yapılan ödemeler."
        head={['Restoran', 'Hizmet Bedeli', 'Ödenen', 'Kalan Borç']}
        rows={data.restaurants}
        empty="Restoran yok."
        render={(r) => (
          <tr key={r.restaurantId} className="border-b border-slate-100 last:border-0">
            <td className="px-4 py-2 font-medium text-text">{r.restaurantName}</td>
            <td className="px-4 py-2 text-muted">{formatTL(r.serviceAmount)}</td>
            <td className="px-4 py-2 text-muted">{formatTL(r.paid)}</td>
            <td className={`px-4 py-2 font-semibold ${r.remainingBalance > 0 ? 'text-danger' : 'text-success'}`}>{formatTL(r.remainingBalance)}</td>
          </tr>
        )}
      />
    </div>}
  </AdminLayout>;
}

function SummaryTable<T>({ title, hint, head, rows, empty, render }: {
  title: string; hint: string; head: string[]; rows: T[]; empty: string; render: (row: T) => ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-text">{title}</h2>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-muted">
            {head.map((h, i) => <th key={h} className={`px-4 py-2 font-medium ${i === 0 ? '' : 'whitespace-nowrap'}`}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={head.length} className="px-4 py-6 text-center text-muted">{empty}</td></tr>
            ) : rows.map(render)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
