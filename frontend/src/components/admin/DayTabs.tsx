import { useState } from 'react';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

function iso(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Month strip of day tabs. Click a day to filter shifts to that single day;
 * navigate months with the arrows. When the month changes the day numbers
 * reset to 1..(month length). Independent from the date-range filter.
 */
export default function DayTabs({ selected, onSelect }: { selected: string | null; onSelect: (iso: string | null) => void }) {
  const today = new Date();
  const initial = selected ? new Date(`${selected}T00:00:00`) : today;
  const [year, setYear] = useState(initial.getFullYear());
  const [month0, setMonth0] = useState(initial.getMonth());

  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month0 + delta, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  };

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftMonth(-1)} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-text hover:bg-slate-100" aria-label="Önceki ay">‹</button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-text">{MONTHS[month0]} {year}</span>
          <button onClick={() => shiftMonth(1)} className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-text hover:bg-slate-100" aria-label="Sonraki ay">›</button>
        </div>
        <button
          onClick={() => onSelect(null)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${selected === null ? 'bg-primary text-white' : 'border border-slate-200 text-muted hover:bg-slate-100'}`}
        >
          Tümü
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayIso = iso(year, month0, day);
          const isSelected = selected === dayIso;
          const isToday = dayIso === todayIso;
          const weekday = WEEKDAYS[new Date(year, month0, day).getDay()];
          return (
            <button
              key={day}
              onClick={() => onSelect(dayIso)}
              className={`flex min-w-[42px] shrink-0 flex-col items-center rounded-lg px-2 py-1.5 text-xs transition-colors ${
                isSelected
                  ? 'bg-accent font-semibold text-white'
                  : isToday
                    ? 'border border-accent/50 text-accent hover:bg-accent/10'
                    : 'border border-slate-200 text-text hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px] opacity-70">{weekday}</span>
              <span className="text-sm font-semibold">{day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
