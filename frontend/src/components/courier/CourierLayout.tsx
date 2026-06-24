import type { ReactNode } from 'react';
import DashboardLayout, { type NavItem } from '../DashboardLayout';

const COURIER_NAV: NavItem[] = [
  { label: 'Genel Bakış', to: '/courier' },
  { label: 'Vardiyalarım', to: '/courier/shifts' },
  { label: 'Hakedişim', to: '/courier/account' },
];

export default function CourierLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout brand="KuryeCrm" navItems={COURIER_NAV}>
      {children}
    </DashboardLayout>
  );
}
