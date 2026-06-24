import type {
  AdvanceStatus,
  FinanceTransactionStatus,
  FinanceTransactionType,
  InvoiceStatus,
  PaymentStatus,
  CourierPaymentStatus,
} from '../../types';

const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap';

const ACTIVE_CANCELLED: Record<'ACTIVE' | 'CANCELLED', { label: string; cls: string }> = {
  ACTIVE: { label: 'Aktif', cls: 'bg-success/10 text-success' },
  CANCELLED: { label: 'İptal', cls: 'bg-danger/10 text-danger' },
};

const INVOICE: Record<InvoiceStatus, { label: string; cls: string }> = {
  UNPAID: { label: 'Ödenmedi', cls: 'bg-danger/10 text-danger' },
  PARTIAL: { label: 'Kısmi', cls: 'bg-warning/20 text-amber-700' },
  PAID: { label: 'Ödendi', cls: 'bg-success/10 text-success' },
  CANCELLED: { label: 'İptal', cls: 'bg-slate-100 text-slate-600' },
};

export function StatusPill({ status }: { status: AdvanceStatus | PaymentStatus | CourierPaymentStatus | FinanceTransactionStatus }) {
  const s = ACTIVE_CANCELLED[status];
  return <span className={`${base} ${s.cls}`}>{s.label}</span>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const s = INVOICE[status];
  return <span className={`${base} ${s.cls}`}>{s.label}</span>;
}

export function TxTypeBadge({ type }: { type: FinanceTransactionType }) {
  const cls = type === 'INCOME' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent';
  return <span className={`${base} ${cls}`}>{type === 'INCOME' ? 'Gelir' : 'Gider'}</span>;
}
