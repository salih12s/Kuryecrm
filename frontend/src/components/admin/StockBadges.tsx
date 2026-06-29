import type { AccessoryType, MotorcycleStatus } from '../../types';

const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap';

const MOTOR_STATUS: Record<MotorcycleStatus, { label: string; cls: string }> = {
  IN_STOCK: { label: 'Stokta', cls: 'bg-success/10 text-success' },
  ASSIGNED: { label: 'Kullanımda', cls: 'bg-sky-100 text-sky-700' },
  SOLD: { label: 'Satıldı', cls: 'bg-accent/10 text-accent' },
};

export const MOTOR_STATUS_OPTIONS: { value: MotorcycleStatus; label: string }[] = (
  Object.keys(MOTOR_STATUS) as MotorcycleStatus[]
).map((value) => ({ value, label: MOTOR_STATUS[value].label }));

export function MotorcycleStatusBadge({ status }: { status: MotorcycleStatus }) {
  const s = MOTOR_STATUS[status];
  return <span className={`${base} ${s.cls}`}>{s.label}</span>;
}

export const ACCESSORY_TYPE_LABEL: Record<AccessoryType, string> = {
  BAG: 'Çanta',
  CHEST_BAG: 'Göğüs Çantası',
  OTHER: 'Diğer',
};

export const ACCESSORY_TYPE_OPTIONS: { value: AccessoryType; label: string }[] = (
  Object.keys(ACCESSORY_TYPE_LABEL) as AccessoryType[]
).map((value) => ({ value, label: ACCESSORY_TYPE_LABEL[value] }));

export function AccessoryTypeBadge({ type }: { type: AccessoryType }) {
  return <span className={`${base} bg-slate-100 text-slate-700`}>{ACCESSORY_TYPE_LABEL[type]}</span>;
}
