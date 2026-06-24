export default function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-success' : 'bg-danger'}`}
      />
      {active ? 'Aktif' : 'Pasif'}
    </span>
  );
}
