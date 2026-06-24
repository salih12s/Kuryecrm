import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import ReportActions from '../../components/reports/ReportActions';
import ReportSummaryCards from '../../components/reports/ReportSummaryCards';
import { exportCsv } from '../../lib/exportCsv';
import { formatDateTR, formatTL, timeRange } from '../../lib/format';
import { reportsApi } from '../../lib/reportsApi';
import type { DailyReport } from '../../types';

const today = () => new Date().toLocaleDateString('sv-SE');
export default function DailyReportPage() {
  const [date, setDate] = useState(today()); const [data, setData] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setData(await reportsApi.daily(date)); } catch { setError('Gün sonu raporu yüklenemedi.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const csv = () => data && exportCsv(`gun-sonu-${date}.csv`, ['Tarih','Restoran','Kurye','Planlanan','Gerçek Başlangıç','Gerçek Bitiş','Geç Başlama (dk)','Normal (sa)','Ek Mesai (sa)','Toplam (sa)','Hizmet Bedeli','Kurye Hak Edişi'], data.shifts.map(s => [s.date,s.restaurantName,s.courierName,timeRange(s.plannedStartTime,s.plannedEndTime),s.actualStartTime,s.actualEndTime,s.lateMinutes,s.normalHours,s.overtimeHours,s.totalWorkHours,s.restaurantServiceAmount,s.courierEarning]));
  return <AdminLayout><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-primary">Gün Sonu Raporu</h1><p className="mt-1 text-sm text-muted">Tek bir günün operasyon ve nakit hareketleri.</p></div><ReportActions onExport={data ? csv : undefined} /></div>
    <div className="mb-6 flex flex-wrap items-end gap-3 print:hidden"><label><span className="mb-1 block text-sm font-medium">Tarih</span><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" /></label><button onClick={load} className="rounded-lg bg-accent px-4 py-2 font-semibold text-white">Raporu Getir</button></div>
    {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}{loading && <p className="py-12 text-center text-muted">Rapor hazırlanıyor...</p>}
    {data && !loading && <div className="space-y-6"><h2 className="font-semibold text-text">{formatDateTR(data.date)}</h2><ReportSummaryCards summary={data.summary} />
      <SimpleSection title="Restoran Bazlı"><Breakdown rows={data.restaurantBreakdown} amountTitle="Hizmet Bedeli" /></SimpleSection>
      <SimpleSection title="Kurye Bazlı"><Breakdown rows={data.courierBreakdown} amountTitle="Hak Ediş" /></SimpleSection>
      <SimpleSection title="Onaylı Vardiyalar"><table className="w-full text-sm"><thead><tr>{['Tarih','Restoran','Kurye','Planlanan','Gerçek Başl.','Gerçek Bitiş','Geç','Normal','Ek Mesai','Toplam','Hizmet','Hak Ediş'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead><tbody>{data.shifts.length ? data.shifts.map(s=><tr key={s.id} className="border-t"><td className="px-3 py-3">{formatDateTR(s.date)}</td><td className="px-3">{s.restaurantName}</td><td className="px-3">{s.courierName}</td><td className="px-3">{timeRange(s.plannedStartTime,s.plannedEndTime)}</td><td className="px-3">{s.actualStartTime}</td><td className="px-3">{s.actualEndTime}</td><td className="px-3">{s.isLate?<span className="font-medium text-amber-700">{s.lateMinutes} dk</span>:'—'}</td><td className="px-3">{s.normalHours} sa</td><td className="px-3">{s.overtimeHours>0?<span className="font-medium text-indigo-700">{s.overtimeHours} sa</span>:'—'}</td><td className="px-3">{s.totalWorkHours} sa</td><td className="px-3">{formatTL(s.restaurantServiceAmount)}</td><td className="px-3">{formatTL(s.courierEarning)}</td></tr>):<Empty col={12}/>}</tbody></table></SimpleSection>
      <SimpleSection title="Gelir / Gider Hareketleri"><table className="w-full text-sm"><tbody>{data.transactions.length ? data.transactions.map(t=><tr key={t.id} className="border-b"><td className="px-4 py-3">{t.type==='INCOME'?'Gelir':'Gider'}</td><td>{t.title}</td><td>{t.category??'—'}</td><td>{formatTL(t.amount)}</td></tr>):<Empty col={4}/>}</tbody></table></SimpleSection>
      <div className="grid gap-6 xl:grid-cols-3"><SimpleSection title="Restoran Ödemeleri"><table className="w-full text-sm"><tbody>{data.payments.length ? data.payments.map(p=><tr key={p.id} className="border-b"><td className="px-4 py-3">{p.restaurantName}</td><td>{p.method??'—'}</td><td>{formatTL(p.amount)}</td></tr>):<Empty col={3}/>}</tbody></table></SimpleSection><SimpleSection title="Kurye Avansları"><table className="w-full text-sm"><tbody>{data.advances.length ? data.advances.map(a=><tr key={a.id} className="border-b"><td className="px-4 py-3">{a.courierName}</td><td>{a.note??'—'}</td><td>{formatTL(a.amount)}</td></tr>):<Empty col={3}/>}</tbody></table></SimpleSection><SimpleSection title="Kurye Ödemeleri"><table className="w-full text-sm"><tbody>{data.courierPayments.length ? data.courierPayments.map(p=><tr key={p.id} className="border-b"><td className="px-4 py-3">{p.courierName}</td><td>{p.method??'—'}</td><td>{formatTL(p.amount)}</td></tr>):<Empty col={3}/>}</tbody></table></SimpleSection></div>
    </div>}
  </AdminLayout>;
}

function SimpleSection({title,children}:{title:string;children:React.ReactNode}){return <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><h3 className="border-b px-4 py-3 font-semibold text-primary">{title}</h3>{children}</section>}
function Empty({col}:{col:number}){return <tr><td colSpan={col} className="px-4 py-8 text-center text-muted">Bu tarih için kayıt yok.</td></tr>}
function Breakdown({rows,amountTitle}:{rows:DailyReport['restaurantBreakdown'];amountTitle:string}){return <table className="w-full text-sm"><thead><tr>{['Ad','Vardiya','Saat',amountTitle].map(h=><th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.length?rows.map(r=><tr key={r.id} className="border-t"><td className="px-4 py-3">{r.name}</td><td>{r.shiftCount}</td><td>{r.workHours} sa</td><td>{formatTL(r.amount)}</td></tr>):<Empty col={4}/>}</tbody></table>}
