import type { ReactNode } from 'react';
import DashboardLayout, { type NavItem } from '../DashboardLayout';

const RESTAURANT_NAV: NavItem[] = [
  { label: 'Genel Bakış', to: '/restaurant' },
  { label: 'Kuryeler & Vardiyalar', to: '/restaurant/shifts' },
  { label: 'Cari Durumum', to: '/restaurant/account' },
];

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout brand="KuryeCrm" navItems={RESTAURANT_NAV}>
      {children}
    </DashboardLayout>
  );
}
