import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-800 bg-ink-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-400">
            Simple prepaid wireless for the United States. Four plans. Instant eSIM. Built by Weeble.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-sm">
          <div className="space-y-2">
            <p className="font-bold text-weeble-400">Explore</p>
            <Link href="/plans" className="block text-ink-400 hover:text-weeble-400">Plans</Link>
            <Link href="/auth" className="block text-ink-400 hover:text-weeble-400">Sign in</Link>
            <Link href="/dashboard" className="block text-ink-400 hover:text-weeble-400">Dashboard</Link>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-weeble-400">Plans</p>
            <p className="text-ink-400">5 GB · 10 GB · 50 GB · Unlimited</p>
          </div>
        </div>
      </div>
      <div className="border-t border-ink-900">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-ink-500">
          © {new Date().getFullYear()} Weeble. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
