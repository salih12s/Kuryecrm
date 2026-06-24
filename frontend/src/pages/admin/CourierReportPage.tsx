import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { exportCsv } from '../../lib/exportCsv';
import { formatDateTR, formatTL } from '../../lib/format';
import { reportsApi } from '../../lib/reportsApi';
import type { CourierReportRow } from '../../types';
import { Filters, Header, ReportTable } from './RestaurantReportPage';

const now = new Date();
const iso = (date: Date) => date.toLocaleDateString('sv-SE');

export default function CourierReportPage() {
  const [startDate, setStart] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [endDate, setEnd] = useState(iso(now));
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<CourierReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setRows(await reportsApi.couriers(startDate, endDate)); }
    catch { setError('Kurye raporu yüklenemedi.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((row) =>
    row.courierName.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')),
  );
  const csv = () => exportCsv(
    `kurye-raporu-${startDate}-${endDate}.csv`,
    ['Kurye', 'Vardiya', 'Saat', 'Hak Ediş', 'Avans', 'Ödeme', 'Kalan', 'Son Ödeme'],
    filtered.map((row) => [row.courierName, row.shiftCount, row.workHours, row.earnings, row.advances, row.payments, row.remainingPayable, row.lastPaymentDate]),
  );

  return <AdminLayout>
    <Header title="Kurye Raporu" sub="Kurye bazında çalışma, hak ediş, avans, ödeme ve kalan alacak." csv={csv} />
    <Filters start={startDate} end={endDate} setStart={setStart} setEnd={setEnd} search={search} setSearch={setSearch} load={load} />
    {error && <p className="text-danger">{error}</p>}
    {loading ? <p className="py-12 text-center text-muted">Yükleniyor...</p> :
      <ReportTable
        heads={['Kurye', 'Vardiya', 'Saat', 'Hak Ediş', 'Avans', 'Ödenen', 'Kalan Ödeme', 'Son Ödeme', 'Durum', '']}
        rows={filtered.map((row) => [
          row.courierName,
          row.shiftCount,
          `${row.workHours} sa`,
          formatTL(row.earnings),
          formatTL(row.advances),
          formatTL(row.payments),
          <b className={row.remainingPayable > 0 ? 'text-danger' : 'text-success'}>{formatTL(row.remainingPayable)}</b>,
          row.lastPaymentDate ? formatDateTR(row.lastPaymentDate) : '—',
          row.isActive ? 'Aktif' : 'Pasif',
          <div className="flex gap-2"><Link className="text-accent" to={`/admin/couriers/${row.courierId}/account`}>Detay</Link><Link className="text-accent" to={`/admin/courier-payments?courierId=${row.courierId}`}>Ödeme Yap</Link></div>,
        ])}
      />}
  </AdminLayout>;
}
