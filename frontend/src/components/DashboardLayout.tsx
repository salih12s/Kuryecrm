import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface NavItem {
  label: string;
  /** Route to navigate to. When omitted the item renders as a disabled button. */
  to?: string;
  /** Optional count badge (e.g. pending confirmations); hidden when 0/undefined. */
  badge?: number;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
  /** Keeps short menus flat while allowing larger menus to be folded into clear groups. */
  collapsible?: boolean;
}

interface Props {
  brand: string;
  navItems?: NavItem[];
  navSections?: NavSection[];
  children: ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Yönetici',
  KURYE_SEFI: 'Kurye Şefi',
  PARTNER: 'Ortak',
  RESTAURANT: 'Restoran',
  COURIER: 'Kurye',
};

/**
 * Shared dashboard shell: dark navy sidebar + light content area.
 * Responsive: the sidebar collapses into a toggle on small screens.
 * Nav items with a `to` use react-router and highlight the active route.
 */
export default function DashboardLayout({ brand, navItems = [], navSections, children }: Props) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sections = useMemo(
    () => navSections ?? [{ items: navItems }],
    [navItems, navSections],
  );
  const activeSection = sections.findIndex((section) =>
    section.items.some((item) => item.to === pathname),
  );
  const [openSections, setOpenSections] = useState<number[]>(() =>
    activeSection >= 0 ? [activeSection] : [],
  );

  useEffect(() => {
    if (activeSection >= 0) {
      setOpenSections((current) =>
        current.includes(activeSection) ? current : [...current, activeSection],
      );
    }
  }, [activeSection]);

  const activeItem = sections
    .flatMap((section) => section.items)
    .find((item) => item.to === pathname);

  const baseItem =
    'rounded-lg px-3 py-2 text-left text-sm transition-colors block w-full';

  const renderItem = (item: NavItem) =>
    item.to ? (
      <NavLink
        key={item.label}
        to={item.to}
        end
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) =>
          `${baseItem} flex items-center gap-3 ${
            isActive
              ? 'bg-accent font-semibold text-white shadow-sm'
              : 'text-slate-700 hover:bg-accent/10 hover:text-accent'
          }`
        }
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70"
          aria-hidden="true"
        />
        <span className="flex-1">{item.label}</span>
        {item.badge ? (
          <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
            {item.badge}
          </span>
        ) : null}
      </NavLink>
    ) : (
      <span key={item.label} className={`${baseItem} cursor-default text-white/40`}>
        {item.label}
      </span>
    );

  return (
    <div className="flex min-h-screen bg-background text-text">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col border-r border-accent/15 bg-[#ffe8e6] text-text shadow-xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-accent/10 px-4">
          <img src="/logo.png" alt={brand} className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />
          <div>
            <span className="block text-base font-semibold leading-tight">{brand}</span>
            <span className="block text-[11px] text-muted">İş yönetim paneli</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Ana menü">
          {sections.map((section, index) => {
            const isOpen = !section.collapsible || openSections.includes(index);
            const hasActiveItem = index === activeSection;
            return (
              <div key={section.label ?? index}>
                {section.label && section.collapsible ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((current) =>
                        current.includes(index)
                          ? current.filter((value) => value !== index)
                          : [...current, index],
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      hasActiveItem ? 'bg-accent/10 text-accent' : 'text-slate-700 hover:bg-accent/10 hover:text-accent'
                    }`}
                    aria-expanded={isOpen}
                  >
                    <span>{section.label}</span>
                    <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
                  </button>
                ) : section.label ? (
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
                    {section.label}
                  </p>
                ) : null}
                {isOpen && (
                  <div className={`space-y-1 ${section.collapsible ? 'mt-1 border-l border-accent/10 pl-2' : ''}`}>
                    {section.items.map(renderItem)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-accent/10 px-4 py-3">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted">{user ? ROLE_LABELS[user.role] ?? user.role : ''}</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-accent/10 bg-card px-4 md:px-8">
          <button
            className="rounded-md p-2 text-muted hover:bg-slate-100 md:hidden"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menüyü aç/kapat"
          >
            ☰
          </button>
          <p className="ml-3 truncate text-sm font-semibold text-primary md:ml-0">
            {activeItem?.label ?? 'Geliyo'}
          </p>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-text">{user?.name}</p>
              <p className="text-xs text-muted">
                {user ? ROLE_LABELS[user.role] ?? user.role : ''}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-slate-100"
            >
              Çıkış Yap
            </button>
          </div>
        </header>

        <main className="w-full flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
