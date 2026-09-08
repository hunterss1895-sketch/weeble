import Link from 'next/link';
import { Logo } from './Logo';
import { getSession } from '@/lib/auth';

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-black">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-400 md:flex">
            <Link href="/plans" className="hover:text-white transition">Plans</Link>
            <Link href="/#how" className="hover:text-white transition">How it works</Link>
            {session && <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-white px-3.5 py-1.5 text-sm font-semibold text-black hover:bg-ink-200 transition"
            >
              My account
            </Link>
          ) : (
            <>
              <Link href="/auth" className="hidden text-sm font-medium text-ink-400 hover:text-white sm:inline transition">
                Sign in
              </Link>
              <Link
                href="/plans"
                className="rounded-md bg-white px-3.5 py-1.5 text-sm font-semibold text-black hover:bg-ink-200 transition"
              >
                Get Weeble
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
