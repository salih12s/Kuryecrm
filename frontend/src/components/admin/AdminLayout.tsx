import type { ReactNode } from 'react';
import DashboardLayout, { type NavSection } from '../DashboardLayout';
import { useAuth } from '../../context/AuthContext';

// Operations sections, visible to both admin and Kurye Şefi.
const OPERATION_SECTION: NavSection = {
  label: 'Operasyon',
  collapsible: true,
  items: [
    { label: 'Vardiyalar', to: '/admin/shifts' },
    { label: 'Restoranlar', to: '/admin/restaurants' },
    { label: 'Kuryeler', to: '/admin/couriers' },
    { label: 'Canlı Harita', to: '/admin/live-map' },
  ],
};

const REPORTS_SECTION: NavSection = {
  label: 'Raporlar',
  collapsible: true,
  items: [
    { label: 'Gün Sonu', to: '/admin/reports/daily' },
    { label: 'Dönem Raporu', to: '/admin/reports/range' },
    { label: 'Restoran Raporu', to: '/admin/reports/restaurants' },
    { label: 'Kurye Raporu', to: '/admin/reports/couriers' },
  ],
};

const FINANCE_SECTION: NavSection = {
  label: 'Finans',
  collapsible: true,
  items: [
    { label: 'Gelir / Gider', to: '/admin/finance-transactions' },
    { label: 'Restoran Cari', to: '/admin/restaurant-accounts' },
    { label: 'Kurye Ödemeleri', to: '/admin/courier-payments' },
    { label: 'Avanslar', to: '/admin/advances' },
  ],
};

// Stock: motorcycle register + accessory (bag) buy/sell with profit. Financial
// in nature, so shown to admin and partners alongside finance.
const STOCK_SECTION: NavSection = {
  label: 'Stok',
  collapsible: true,
  items: [
    { label: 'Motorlar', to: '/admin/stock/motorcycles' },
    { label: 'Aksesuarlar', to: '/admin/stock/accessories' },
  ],
};

// Full admin navigation.
const ADMIN_NAV: NavSection[] = [
  { items: [{ label: 'Genel Bakış', to: '/admin' }] },
  OPERATION_SECTION,
  {
    label: 'Onaylar',
    items: [{ label: 'Bekleyen Onaylar', to: '/admin/approvals' }],
  },
  REPORTS_SECTION,
  FINANCE_SECTION,
  STOCK_SECTION,
  {
    label: 'Sistem',
    items: [
      { label: 'Kullanıcılar', to: '/admin/users' },
      { label: 'Ayarlar', to: '/admin/settings' },
    ],
  },
];

// Kurye Şefi: operations only (incl. live map). No reports/finance/approvals/settings.
const KURYE_SEFI_NAV: NavSection[] = [OPERATION_SECTION];

// Ortaklar (Partner): finance + financial reports + stock. No operations/map/settings.
const PARTNER_NAV: NavSection[] = [FINANCE_SECTION, STOCK_SECTION, REPORTS_SECTION];

function navFor(role?: string): NavSection[] {
  if (role === 'KURYE_SEFI') return KURYE_SEFI_NAV;
  if (role === 'PARTNER') return PARTNER_NAV;
  return ADMIN_NAV;
}

/** Admin shell — same chrome on every admin page with the shared sidebar. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <DashboardLayout brand="Geliyo" navSections={navFor(user?.role)}>
      {children}
    </DashboardLayout>
  );
}
