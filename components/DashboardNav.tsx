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
              'rounded-xl px-3 py-2 text-sm font-medium transition',
              active ? 'bg-weeble-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-weeble-50'
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
