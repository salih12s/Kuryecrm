import type { ClockPhase, ShiftConfirmationStatus, ShiftStatus } from '../../types';

const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap';

const STATUS_STYLE: Record<ShiftStatus, { label: string; cls: string }> = {
  PLANNED: { label: 'Planlandı', cls: 'bg-slate-100 text-slate-600' },
  IN_PROGRESS: { label: 'Devam Ediyor', cls: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Tamamlandı', cls: 'bg-success/10 text-success' },
  CANCELLED: { label: 'İptal', cls: 'bg-danger/10 text-danger' },
  DISPUTED: { label: 'Uyuşmazlık', cls: 'bg-accent/10 text-accent' },
};

const CONFIRMATION_STYLE: Record<ShiftConfirmationStatus, { label: string; cls: string }> = {
  WAITING: { label: 'Bekliyor', cls: 'bg-slate-100 text-slate-600' },
  RESTAURANT_SUBMITTED: { label: 'Restoran Bildirdi', cls: 'bg-blue-100 text-blue-700' },
  COURIER_SUBMITTED: { label: 'Kurye Bildirdi', cls: 'bg-blue-100 text-blue-700' },
  MATCHED: { label: 'Eşleşti', cls: 'bg-success/10 text-success' },
  DISPUTED: { label: 'Uyuşmazlık Var', cls: 'bg-danger/10 text-danger' },
  ADMIN_APPROVED: { label: 'Onaylandı', cls: 'bg-success/10 text-success' },
};

const CLOCK_PHASE_STYLE: Record<ClockPhase, { label: string; cls: string }> = {
  WAITING_START: { label: 'Başlamadı', cls: 'bg-slate-100 text-slate-600' },
  START_PENDING_CONFIRM: { label: 'Başlangıç onayı bekleniyor', cls: 'bg-amber-100 text-amber-700' },
  RUNNING: { label: 'Mesai sürüyor', cls: 'bg-blue-100 text-blue-700' },
  END_PENDING_CONFIRM: { label: 'Çıkış onayı bekleniyor', cls: 'bg-amber-100 text-amber-700' },
  MATCHED: { label: 'Eşleşti', cls: 'bg-success/10 text-success' },
  DISPUTED: { label: 'Uyuşmazlık Var', cls: 'bg-danger/10 text-danger' },
};

export function getClockPhaseLabel(phase: ClockPhase): string {
  return CLOCK_PHASE_STYLE[phase].label;
}

export function ClockPhaseBadge({ phase }: { phase: ClockPhase }) {
  const s = CLOCK_PHASE_STYLE[phase];
  return <span className={`${base} ${s.cls}`}>{s.label}</span>;
}

export function getShiftStatusLabel(status: ShiftStatus): string {
  return STATUS_STYLE[status].label;
}

export function getConfirmationStatusLabel(status: ShiftConfirmationStatus): string {
  return CONFIRMATION_STYLE[status].label;
}

export function ShiftStatusBadge({ status }: { status: ShiftStatus }) {
  const s = STATUS_STYLE[status];
  return <span className={`${base} ${s.cls}`}>{s.label}</span>;
}

export function ConfirmationBadge({ status }: { status: ShiftConfirmationStatus }) {
  const s = CONFIRMATION_STYLE[status];
  return <span className={`${base} ${s.cls}`}>{s.label}</span>;
}

/**
 * Courier's own informational plan acknowledgment. Purely a display of
 * `courierAcknowledged`; independent of ShiftConfirmationStatus/ADMIN_APPROVED.
 * Pass `onClick` to render it as a toggle button (courier's own panel);
 * omit it for a read-only badge (admin panel).
 */
export function CourierAckBadge({
  acknowledged,
  onClick,
}: {
  acknowledged: boolean;
  onClick?: () => void;
}) {
  const cls = acknowledged ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-600';
  const label = acknowledged ? 'Onayladı' : 'Onaylamadı';
  if (!onClick) {
    return <span className={`${base} ${cls}`}>{label}</span>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title="Değiştirmek için tıklayın"
      className={`${base} ${cls} cursor-pointer hover:opacity-80`}
    >
      {label}
    </button>
  );
}
