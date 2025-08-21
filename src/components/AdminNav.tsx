'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Which routes should hide the menu (e.g., the login page)
  const isHidden = pathname === '/admin';

  // Close on Esc — run this hook unconditionally to keep hook order stable
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/questions', label: 'Questions' },
    { href: '/admin/groups', label: 'Groups' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  async function logout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.href = '/';
    } catch {
      /* no-op */
    }
  }

  // Only decide what to render AFTER hooks have been called
  if (isHidden) return null;

  return (
    <>
      {/* top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 h-12 flex items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="inline-flex items-center gap-2 rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            {/* burger icon */}
            <span className="block w-4 h-[2px] bg-black relative">
              <span className="block w-4 h-[2px] bg-black absolute -top-2"></span>
              <span className="block w-4 h-[2px] bg-black absolute top-2"></span>
            </span>
            <span className="text-sm">Menu</span>
          </button>
          <div className="text-sm opacity-70 truncate">{pathname}</div>
        </div>
      </header>

      {/* overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* drawer */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-[280px] bg-white border-r shadow-xl transform transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-12 border-b flex items-center justify-between px-4">
          <div className="font-semibold text-sm">Admin</div>
          <button
            onClick={() => setOpen(false)}
            className="text-sm underline opacity-80 hover:opacity-100"
          >
            Close
          </button>
        </div>

        <nav className="p-2">
          <ul className="space-y-1">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded px-3 py-2 text-sm ${
                      active ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 border-t pt-4">
            <button
              onClick={logout}
              className="w-full text-left rounded px-3 py-2 text-sm hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
