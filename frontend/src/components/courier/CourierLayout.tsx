import { useEffect, useState, type ReactNode } from 'react';
import DashboardLayout, { type NavItem } from '../DashboardLayout';
import Modal from '../Modal';
import { useCourierTracking } from '../../hooks/useCourierTracking';
import { courierShiftsApi } from '../../lib/shiftsApi';
import { formatDateTR, timeRange } from '../../lib/format';
import type { PartyShift } from '../../types';

/** Polls the count of this courier's clock events awaiting restaurant confirmation. */
function useWaitingConfirmations(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () =>
      courierShiftsApi
        .waitingCount()
        .then((c) => active && setCount(c))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 20_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);
  return count;
}

/**
 * Newly planned shifts not yet acknowledged by the courier — surfaced as a
 * blocking modal (one at a time) rather than the passive list-view badge, so
 * a new assignment can't go unnoticed.
 */
function usePendingAcknowledgments() {
  const [pending, setPending] = useState<PartyShift[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = () =>
    courierShiftsApi
      .pendingAcknowledgment()
      .then(setPending)
      .catch(() => undefined);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = pending.find((s) => !dismissed.has(s.id)) ?? null;

  const accept = async () => {
    if (!current) return;
    await courierShiftsApi.setAcknowledged(current.id, true);
    await load();
  };

  const decline = () => {
    if (!current) return;
    // No separate "rejected" state exists — dismiss for this session, the
    // shift stays "Onaylamadı" and the modal reappears next visit.
    setDismissed((prev) => new Set(prev).add(current.id));
  };

  return { current, accept, decline };
}

/** Blocking confirm/decline modal for a newly planned shift. */
function AcknowledgeShiftModal({
  shift,
  onAccept,
  onDecline,
}: {
  shift: PartyShift;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await onAccept();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title="Yeni Vardiya Bildirimi" onClose={onDecline}>
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-text">
          <p><b>Restoran:</b> {shift.restaurantName}</p>
          <p><b>Tarih:</b> {formatDateTR(shift.date)}</p>
          <p><b>Saat:</b> {timeRange(shift.plannedStartTime, shift.plannedEndTime)}</p>
          {shift.note && <p className="mt-1 text-xs text-muted">📝 {shift.note}</p>}
        </div>
        <p className="text-sm text-text">Bu vardiyayı onaylıyor musunuz?</p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onDecline}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-text hover:bg-slate-100"
          >
            Onaylamıyorum
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={busy}
            className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-60"
          >
            {busy ? '...' : 'Onaylıyorum'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Small banner reflecting the live-tracking state during an active shift. */
function TrackingBanner() {
  const t = useCourierTracking(true);

  if (t.permission === 'denied') {
    return (
      <Banner tone="danger">
        Konum izni reddedildi. Vardiya sırasında takip için tarayıcı konum iznini açın.
      </Banner>
    );
  }
  if (t.permission === 'unsupported') {
    return <Banner tone="danger">Tarayıcınız konum servisini desteklemiyor.</Banner>;
  }
  if (t.active) {
    return (
      <Banner tone="success">
        Konum takibi aktif{t.restaurantName ? ` · ${t.restaurantName}` : ''}. Vardiyanız boyunca konumunuz
        paylaşılır.
      </Banner>
    );
  }
  return <Banner tone="muted">Aktif vardiya yok — konum paylaşılmıyor.</Banner>;
}

function Banner({ tone, children }: { tone: 'success' | 'danger' | 'muted'; children: ReactNode }) {
  const styles =
    tone === 'success'
      ? 'border-success/30 bg-success/10 text-success'
      : tone === 'danger'
        ? 'border-danger/30 bg-danger/10 text-danger'
        : 'border-slate-200 bg-slate-50 text-muted';
  return (
    <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${styles}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {children}
    </div>
  );
}

export default function CourierLayout({ children }: { children: ReactNode }) {
  const waiting = useWaitingConfirmations();
  const { current: pendingAck, accept, decline } = usePendingAcknowledgments();
  const nav: NavItem[] = [
    { label: 'Genel Bakış', to: '/courier' },
    { label: 'Vardiyalarım', to: '/courier/shifts', badge: waiting },
    { label: 'Hakedişim', to: '/courier/account' },
  ];
  return (
    <DashboardLayout brand="Geliyo" navItems={nav}>
      <TrackingBanner />
      {waiting > 0 && (
        <Banner tone="muted">
          {waiting} mesai bildiriminiz restoran onayını bekliyor.
        </Banner>
      )}
      {children}
      {pendingAck && <AcknowledgeShiftModal shift={pendingAck} onAccept={accept} onDecline={decline} />}
    </DashboardLayout>
  );
}
