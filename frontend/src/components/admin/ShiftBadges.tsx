import type { ShiftConfirmationStatus, ShiftStatus } from '../../types';

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
