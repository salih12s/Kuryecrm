import { useEffect, useState, type ReactNode } from 'react';
import DashboardLayout, { type NavItem } from '../DashboardLayout';
import { useCourierTracking } from '../../hooks/useCourierTracking';
import { courierShiftsApi } from '../../lib/shiftsApi';

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
    </DashboardLayout>
  );
}
