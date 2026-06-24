export default function ReportActions({ onExport }: { onExport?: () => void }) {
  return <div className="flex gap-2 print:hidden">
    {onExport && <button onClick={onExport} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-text hover:bg-slate-50">Tabloyu İndir</button>}
    <button onClick={() => window.print()} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90">Yazdır</button>
  </div>;
}
