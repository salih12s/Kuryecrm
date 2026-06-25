import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Compact "⋮" actions menu. Tucks a row's actions behind a single button to
 * keep dense tables readable. The dropdown is rendered in a portal with fixed
 * positioning so it is never clipped by the table's overflow container, and it
 * flips above the button (or scrolls) when there isn't room below.
 * Closes on outside click, scroll, resize or Escape.
 */
export default function KebabMenu({ children, label = 'İşlemler' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open) setRect(btnRef.current?.getBoundingClientRect() ?? null);
    setStyle({ position: 'fixed', visibility: 'hidden' });
    setOpen((v) => !v);
  };

  // Position the menu relative to the button, flipping up / capping height as needed.
  useLayoutEffect(() => {
    if (!open || !rect) return;
    const margin = 8;
    const menuH = menuRef.current?.offsetHeight ?? 0;
    const right = window.innerWidth - rect.right;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    let top: number;
    let maxHeight: number | undefined;
    if (menuH <= spaceBelow) {
      top = rect.bottom + 4;
    } else if (menuH <= spaceAbove) {
      top = rect.top - menuH - 4;
    } else if (spaceBelow >= spaceAbove) {
      top = rect.bottom + 4;
      maxHeight = spaceBelow;
    } else {
      top = margin;
      maxHeight = spaceAbove;
    }
    setStyle({ position: 'fixed', top, right, zIndex: 50, maxHeight, overflowY: maxHeight ? 'auto' : undefined, visibility: 'visible' });
  }, [open, rect]);

  useLayoutEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-lg leading-none text-muted hover:bg-slate-100"
      >
        ⋮
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onClick={() => setOpen(false)}
            style={style}
            className="w-48 rounded-lg border border-slate-200 bg-white p-1 text-left shadow-lg"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

/** A single item inside KebabMenu. `tone` colours destructive actions. */
export function KebabItem({
  onClick,
  disabled = false,
  tone = 'default',
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger' | 'success';
  children: ReactNode;
}) {
  const toneClass =
    tone === 'danger' ? 'text-danger hover:bg-danger/10' : tone === 'success' ? 'text-success hover:bg-success/10' : 'text-text hover:bg-slate-100';
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`block w-full rounded-md px-3 py-2 text-left text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {children}
    </button>
  );
}
