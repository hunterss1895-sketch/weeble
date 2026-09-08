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
    <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-6">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] transition',
              active
                ? 'bg-white text-black'
                : 'border border-white/15 text-white/55 hover:border-white/40 hover:text-white'
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
