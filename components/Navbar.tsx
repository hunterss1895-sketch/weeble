import Link from 'next/link';
import { Logo } from './Logo';
import { getSession } from '@/lib/auth';

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5 sm:h-16 sm:px-8">
        <div className="flex items-center gap-8 lg:gap-10">
          <Logo />
          <nav className="hidden items-center gap-6 text-[13px] font-medium text-white/75 md:flex">
            <Link href="/plans" className="hover:text-white transition">
              Plans
            </Link>
            <Link href="/#coverage" className="hover:text-white transition">
              Coverage
            </Link>
            <Link href="/#how" className="hover:text-white transition">
              How it works
            </Link>
            {session && (
              <Link href="/dashboard" className="hover:text-white transition">
                Account
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {!session && (
            <Link
              href="/auth"
              className="hidden text-[13px] font-medium text-white/65 hover:text-white sm:inline transition"
            >
              Sign in
            </Link>
          )}
          <Link
            href={session ? '/dashboard' : '/plans'}
            className="rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-black hover:bg-white/90 transition"
          >
            {session ? 'Account' : 'Order'}
          </Link>
        </div>
      </div>
    </header>
  );
}
