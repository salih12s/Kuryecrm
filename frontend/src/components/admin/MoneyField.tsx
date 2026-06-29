/**
 * Money input that displays Turkish thousands grouping (45.000) while the form
 * stores a plain numeric string ("45000" / "45000.50") so `Number(value)` is
 * always safe. Decimal separator on screen is a comma; grouping is a dot.
 */
interface Props {
  label: string;
  /** Raw numeric string: digits with optional "." decimal. e.g. "" | "45000" | "45000.5" */
  value: string;
  onChange: (raw: string) => void;
  required?: boolean;
  placeholder?: string;
}

/** Raw "45000.5" -> display "45.000,5". */
function toDisplay(raw: string): string {
  if (raw === '') return '';
  const [intPart, decPart] = raw.split('.');
  const grouped = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${grouped},${decPart}` : grouped;
}

/** Typed text -> raw numeric string ("." decimal). Keeps at most 2 decimals. */
function toRaw(input: string): string {
  // Strip grouping dots and anything that isn't a digit or comma.
  let s = input.replace(/\./g, '').replace(/[^\d,]/g, '');
  const comma = s.indexOf(',');
  if (comma === -1) return s;
  const intp = s.slice(0, comma).replace(/,/g, '');
  const decp = s.slice(comma + 1).replace(/,/g, '').slice(0, 2);
  return `${intp}.${decp}`;
}

export default function MoneyField({ label, value, onChange, required, placeholder }: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-text">{label}</span>
      <div className="relative">
        <input
          inputMode="decimal"
          required={required}
          placeholder={placeholder}
          value={toDisplay(value)}
          onChange={(e) => onChange(toRaw(e.target.value))}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-8 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">₺</span>
      </div>
    </label>
  );
}
