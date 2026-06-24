import { formatTL } from '../../lib/format';

export default function MiniBars({ title, rows, money = false }: { title: string; rows: { label: string; value: number }[]; money?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h3 className="mb-4 font-semibold text-primary">{title}</h3>
    {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted">Bu dönem için veri yok.</p> :
      <div className="space-y-3">{rows.map((row) => <div key={row.label}>
        <div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate text-muted">{row.label}</span><span className="font-medium text-text">{money ? formatTL(row.value) : row.value}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${row.value < 0 ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${Math.max(2, Math.abs(row.value) / max * 100)}%` }} /></div>
      </div>)}</div>}
  </div>;
}
