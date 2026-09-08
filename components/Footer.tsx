import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-800 bg-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-500">
            Travel eSIM with pay-as-you-go data credit. Instant QR. Built by Weeble.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-sm">
          <div className="space-y-2">
            <p className="font-medium text-ink-300">Explore</p>
            <Link href="/plans" className="block text-ink-500 hover:text-white">Plans</Link>
            <Link href="/auth" className="block text-ink-500 hover:text-white">Sign in</Link>
            <Link href="/dashboard" className="block text-ink-500 hover:text-white">Dashboard</Link>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-ink-300">Credit packs</p>
            <p className="text-ink-500">$10 · $25 · $50 · $100 data credit</p>
          </div>
        </div>
      </div>
      <div className="border-t border-ink-900">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-ink-600">
          © {new Date().getFullYear()} Weeble. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
