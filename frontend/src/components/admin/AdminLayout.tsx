import type { ReactNode } from 'react';
import DashboardLayout, { type NavSection } from '../DashboardLayout';

const ADMIN_NAV: NavSection[] = [
  {
    items: [{ label: 'Genel Bakış', to: '/admin' }],
  },
  {
    label: 'Operasyon',
    collapsible: true,
    items: [
      { label: 'Vardiyalar', to: '/admin/shifts' },
      { label: 'Restoranlar', to: '/admin/restaurants' },
      { label: 'Kuryeler', to: '/admin/couriers' },
    ],
  },
  {
    label: 'Raporlar',
    collapsible: true,
    items: [
      { label: 'Gün Sonu', to: '/admin/reports/daily' },
      { label: 'Dönem Raporu', to: '/admin/reports/range' },
      { label: 'Restoran Raporu', to: '/admin/reports/restaurants' },
      { label: 'Kurye Raporu', to: '/admin/reports/couriers' },
    ],
  },
  {
    label: 'Finans',
    collapsible: true,
    items: [
      { label: 'Gelir / Gider', to: '/admin/finance-transactions' },
      { label: 'Restoran Cari', to: '/admin/restaurant-accounts' },
      { label: 'Kurye Ödemeleri', to: '/admin/courier-payments' },
      { label: 'Avanslar', to: '/admin/advances' },
    ],
  },
  {
    label: 'Yardım',
    items: [{ label: 'Sistem Rehberi', to: '/admin/guide' }],
  },
];

/** Admin shell — same chrome on every admin page with the shared sidebar. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout brand="KuryeCrm" navSections={ADMIN_NAV}>
      {children}
    </DashboardLayout>
  );
}
