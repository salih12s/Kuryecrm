interface Props {
  label: string;
  value: string | number;
  accent?: boolean;
}

export default function StatCard({ label, value, accent }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ? 'text-accent' : 'text-primary'}`}>
        {value}
      </p>
    </div>
  );
}
