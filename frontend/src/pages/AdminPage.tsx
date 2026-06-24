import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import StatCard from '../components/StatCard';
import MiniBars from '../components/reports/MiniBars';
import { formatTL, formatDateTR } from '../lib/format';
import { reportsApi } from '../lib/reportsApi';
import type { DashboardReport } from '../types';

export default function AdminPage() {
  const [data, setData] = useState<DashboardReport | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { reportsApi.dashboard().then(setData).catch(() => setError('Genel bakış verileri yüklenemedi.')); }, []);
  return <AdminLayout>
    <div className="mb-6"><h1 className="text-2xl font-bold text-primary">Genel Bakış</h1><p className="mt-1 text-sm text-muted">Bugünün operasyon, kârlılık ve nakit görünümü.</p></div>
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-primary">Hızlı İşlemler</h2>
      <p className="mt-1 text-sm text-muted">Günlük işlerinize buradan doğrudan ulaşın.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Vardiyaları Yönet', 'Planlama ve onay işlemleri', '/admin/shifts'],
          ['Gün Sonunu Gör', 'Bugünün operasyon özeti', '/admin/reports/daily'],
          ['Kurye Ödemesi', 'Hak ediş ve ödeme kaydı', '/admin/courier-payments'],
          ['Restoran Cari', 'Fatura, tahsilat ve bakiye', '/admin/restaurant-accounts'],
        ].map(([title, description, to]) => (
          <Link key={to} to={to} className="group rounded-lg border border-slate-200 p-3 transition-colors hover:border-accent/50 hover:bg-orange-50/50">
            <span className="flex items-center justify-between text-sm font-semibold text-text group-hover:text-accent">
              {title}<span aria-hidden="true">→</span>
            </span>
            <span className="mt-1 block text-xs text-muted">{description}</span>
          </Link>
        ))}
      </div>
    </section>
    {error && <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>}
    {!data && !error && <p className="py-12 text-center text-muted">Genel bakış yükleniyor...</p>}
    {data && <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Bugünkü Çalışma Saati" value={`${data.totalWorkHours} sa`} />
        <StatCard label="Bugünkü Hizmet Bedeli" value={formatTL(data.restaurantServiceAmount)} />
        <StatCard label="Bugünkü Kurye Hak Edişi" value={formatTL(data.courierEarnings)} />
        <StatCard label="Bugünkü Brüt Fark" value={formatTL(data.grossDifference)} />
        <StatCard label="Operasyonel Net Kâr" value={formatTL(data.operationalNetProfit)} accent />
        <StatCard label="Bugünkü Kasa Hareketi" value={formatTL(data.cashMovement)} accent />
        <StatCard label="Açık Restoran Bakiyesi" value={formatTL(data.totalOpenRestaurantBalance)} />
        <StatCard label="Kurye Kalan Ödeme" value={formatTL(data.totalCourierRemainingPayable)} />
        <StatCard label="Bekleyen / Uyuşmaz Vardiya" value={data.pendingShiftCount} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MiniBars title="Son 7 Gün Net Kâr" money rows={data.last7Days.map((d) => ({ label: formatDateTR(d.date), value: d.operationalNetProfit }))} />
        <MiniBars title="Son 7 Gün Çalışma Saati" rows={data.last7Days.map((d) => ({ label: formatDateTR(d.date), value: d.totalWorkHours }))} />
        <MiniBars title="Bugün Restoran Hizmet Bedeli" money rows={data.restaurantDistribution.map((r) => ({ label: r.name, value: r.amount }))} />
        <MiniBars title="Bugün Kurye Hak Edişi" money rows={data.courierDistribution.map((r) => ({ label: r.name, value: r.amount }))} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-muted">Aktif restoran: <b className="text-text">{data.activeRestaurantCount}</b> · Aktif kurye: <b className="text-text">{data.activeCourierCount}</b></div>
    </div>}
  </AdminLayout>;
}
