import type { StatusFilter } from '../../types';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  status: StatusFilter;
  onStatus: (v: StatusFilter) => void;
  onAdd: () => void;
  addLabel: string;
  searchPlaceholder: string;
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'passive', label: 'Pasif' },
];

export default function ListToolbar({
  search,
  onSearch,
  status,
  onStatus,
  onAdd,
  addLabel,
  searchPlaceholder,
}: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 sm:max-w-xs"
        />
        <div className="inline-flex rounded-lg border border-slate-300 bg-card p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onStatus(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === f.value
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={onAdd}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
      >
        + {addLabel}
      </button>
    </div>
  );
}
