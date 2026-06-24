import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import MiniBars from '../../components/reports/MiniBars';
import ReportActions from '../../components/reports/ReportActions';
import ReportSummaryCards from '../../components/reports/ReportSummaryCards';
import { exportCsv } from '../../lib/exportCsv';
import { formatDateTR, formatTL } from '../../lib/format';
import { reportsApi } from '../../lib/reportsApi';
import type { RangeReport } from '../../types';

const iso = (date: Date) => date.toLocaleDateString('sv-SE');
const currentMonth = () => {
  const now = new Date();
  return {
    start: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: iso(now),
  };
};

export default function RangeReportPage() {
  const initial = currentMonth();
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [data, setData] = useState<RangeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (start = startDate, end = endDate) => {
    setLoading(true);
    setError('');
    try {
      setData(await reportsApi.range(start, end));
    } catch {
      setError('Tarih aralığı raporu yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const applyPreset = (kind: string) => {
    const now = new Date();
    let start = iso(now);
    let end = iso(now);
    if (kind === 'week') {
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      start = iso(monday);
    }
    if (kind === 'month') start = iso(new Date(now.getFullYear(), now.getMonth(), 1));
    if (kind === 'last') {
      start = iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = iso(new Date(now.getFullYear(), now.getMonth(), 0));
    }
    setStartDate(start);
    setEndDate(end);
    void load(start, end);
  };

  const exportReport = () => data && exportCsv(
    `donem-${startDate}-${endDate}.csv`,
    ['Tarih', 'Vardiya', 'Saat', 'Hizmet', 'Hak Ediş', 'Kurye Ödemesi', 'Net Kâr', 'Kasa'],
    data.dailyBreakdown.map((day) => [
      day.date,
      day.approvedShiftCount,
      day.totalWorkHours,
      day.restaurantServiceAmount,
      day.courierEarnings,
      day.courierPayments,
      day.operationalNetProfit,
      day.cashMovement,
    ]),
  );

  return <AdminLayout>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-primary">Dönem Raporu</h1>
        <p className="mt-1 text-sm text-muted">Bugün, bu hafta, bu ay veya seçtiğiniz tarih aralığının özeti.</p>
      </div>
      <ReportActions onExport={data ? exportReport : undefined} />
    </div>

    <div className="mb-6 flex flex-wrap items-end gap-2 print:hidden">
      <label>
        <span className="mb-1 block text-xs">Başlangıç</span>
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-lg border px-3 py-2" />
      </label>
      <label>
        <span className="mb-1 block text-xs">Bitiş</span>
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-lg border px-3 py-2" />
      </label>
      <button onClick={() => void load()} className="rounded-lg bg-accent px-4 py-2 font-semibold text-white">Getir</button>
      {[
        ['today', 'Bugün'],
        ['week', 'Bu Hafta'],
        ['month', 'Bu Ay'],
        ['last', 'Geçen Ay'],
      ].map(([key, label]) => <button key={key} onClick={() => applyPreset(key)} className="rounded-lg border bg-white px-3 py-2 text-sm">{label}</button>)}
    </div>

    {error && <p className="rounded-lg bg-danger/10 p-3 text-danger">{error}</p>}
    {loading && <p className="py-12 text-center text-muted">Rapor hazırlanıyor...</p>}
    {data && !loading && <div className="space-y-6">
      <ReportSummaryCards summary={data.summary} />
      <div className="grid gap-4 lg:grid-cols-2">
        <MiniBars title="Günlük Net Kâr" money rows={data.dailyBreakdown.map((day) => ({ label: formatDateTR(day.date), value: day.operationalNetProfit }))} />
        <MiniBars title="Günlük Çalışma Saati" rows={data.dailyBreakdown.map((day) => ({ label: formatDateTR(day.date), value: day.totalWorkHours }))} />
      </div>
      <Table
        title="Gün Gün Kırılım"
        heads={['Tarih', 'Vardiya', 'Saat', 'Hizmet', 'Hak Ediş', 'Kurye Ödemesi', 'Net Kâr', 'Kasa']}
        rows={data.dailyBreakdown.map((day) => [
          formatDateTR(day.date),
          day.approvedShiftCount,
          `${day.totalWorkHours} sa`,
          formatTL(day.restaurantServiceAmount),
          formatTL(day.courierEarnings),
          formatTL(day.courierPayments),
          formatTL(day.operationalNetProfit),
          formatTL(day.cashMovement),
        ])}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Table title="Restoran Kırılımı" heads={['Restoran', 'Vardiya', 'Saat', 'Hizmet']} rows={data.restaurantBreakdown.map((row) => [row.name, row.shiftCount, `${row.workHours} sa`, formatTL(row.amount)])} />
        <Table title="Kurye Kırılımı" heads={['Kurye', 'Vardiya', 'Saat', 'Hak Ediş']} rows={data.courierBreakdown.map((row) => [row.name, row.shiftCount, `${row.workHours} sa`, formatTL(row.amount)])} />
      </div>
    </div>}
  </AdminLayout>;
}

function Table({ title, heads, rows }: { title: string; heads: string[]; rows: (string | number)[][] }) {
  return <section className="overflow-x-auto rounded-xl border bg-white">
    <h3 className="border-b px-4 py-3 font-semibold text-primary">{title}</h3>
    <table className="w-full text-sm">
      <thead><tr>{heads.map((head) => <th key={head} className="px-4 py-3 text-left">{head}</th>)}</tr></thead>
      <tbody>
        {rows.length
          ? rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}</tr>)
          : <tr><td colSpan={heads.length} className="px-4 py-8 text-center text-muted">Bu dönem için veri yok.</td></tr>}
      </tbody>
    </table>
  </section>;
}
