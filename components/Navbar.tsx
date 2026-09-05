import Link from 'next/link';
import { Logo } from './Logo';
import { getSession } from '@/lib/auth';

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-semibold text-ink-300 md:flex">
            <Link href="/plans" className="hover:text-weeble-400 transition">Plans</Link>
            <Link href="/#how" className="hover:text-weeble-400 transition">How it works</Link>
            {session && <Link href="/dashboard" className="hover:text-weeble-400 transition">Dashboard</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-weeble-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-weeble-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weeble-400"
            >
              My account
            </Link>
          ) : (
            <>
              <Link href="/auth" className="hidden text-sm font-semibold text-ink-300 hover:text-weeble-400 sm:inline transition">
                Sign in
              </Link>
              <Link
                href="/plans"
                className="rounded-full bg-weeble-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-weeble-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weeble-400"
              >
                Get Weeble
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-weeble-500 to-transparent opacity-80" />
    </header>
  );
}
