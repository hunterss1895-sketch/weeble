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
              'rounded-md px-3.5 py-2 text-sm font-medium transition',
              active
                ? 'bg-white text-black'
                : 'border border-ink-800 bg-ink-950 text-ink-400 hover:border-ink-600 hover:text-white'
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
