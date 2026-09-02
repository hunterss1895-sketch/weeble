import Link from 'next/link';
import { Logo } from './Logo';
import { getSession } from '@/lib/auth';
import { providerMeta } from '@/lib/providers';
import { Badge } from './ui';

export async function Navbar() {
  const session = await getSession();
  const meta = providerMeta();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-4 text-sm font-medium text-slate-600 md:flex">
            <Link href="/plans" className="hover:text-weeble-700">Plans</Link>
            <Link href="/plans?region=international" className="hover:text-weeble-700">International</Link>
            {session && <Link href="/dashboard" className="hover:text-weeble-700">Dashboard</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {meta.isDemo && <Badge tone="amber">Demo mode</Badge>}
          {session ? (
            <Link href="/dashboard" className="rounded-xl bg-weeble-600 px-3 py-2 text-sm font-medium text-white hover:bg-weeble-700">
              My account
            </Link>
          ) : (
            <Link href="/auth" className="rounded-xl bg-weeble-600 px-3 py-2 text-sm font-medium text-white hover:bg-weeble-700">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
