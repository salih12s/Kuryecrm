import type { ReactNode } from 'react';
import DashboardLayout, { type NavItem } from '../DashboardLayout';
import { useCourierTracking } from '../../hooks/useCourierTracking';

const COURIER_NAV: NavItem[] = [
  { label: 'Genel Bakış', to: '/courier' },
  { label: 'Vardiyalarım', to: '/courier/shifts' },
  { label: 'Hakedişim', to: '/courier/account' },
];

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
  return (
    <DashboardLayout brand="KuryeCrm" navItems={COURIER_NAV}>
      <TrackingBanner />
      {children}
    </DashboardLayout>
  );
}
