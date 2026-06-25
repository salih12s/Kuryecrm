import { useEffect, useState, type ReactNode } from 'react';
import DashboardLayout, { type NavItem } from '../DashboardLayout';
import { restaurantShiftsApi } from '../../lib/shiftsApi';

/** Polls the count of shifts awaiting this restaurant's clock confirmation. */
function usePendingConfirmations(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () =>
      restaurantShiftsApi
        .pendingCount()
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

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  const pending = usePendingConfirmations();

  const nav: NavItem[] = [
    { label: 'Genel Bakış', to: '/restaurant' },
    { label: 'Kuryeler & Vardiyalar', to: '/restaurant/shifts', badge: pending },
    { label: 'Cari Durumum', to: '/restaurant/account' },
  ];

  return (
    <DashboardLayout brand="Geliyo" navItems={nav}>
      {pending > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
          {pending} vardiya onayınızı bekliyor. “Kuryeler &amp; Vardiyalar” ekranından onaylayın.
        </div>
      )}
      {children}
    </DashboardLayout>
  );
}
