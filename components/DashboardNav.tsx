'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/devices', label: 'Devices' },
  { href: '/dashboard/usage', label: 'Usage' },
  { href: '/dashboard/earn', label: 'Earn data' },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-bold transition',
              active
                ? 'bg-weeble-500 text-ink-950'
                : 'bg-ink-900 text-ink-300 ring-1 ring-ink-800 hover:text-weeble-400 hover:ring-weeble-500/40'
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
