import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-0 border-t border-white/10 bg-black">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/45">
            Instant eSIM data for the United States and 200+ destinations. Clear GB plans. Weeble
            branding only.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Product</p>
          <ul className="mt-4 space-y-3 text-sm text-white/65">
            <li>
              <Link href="/plans" className="hover:text-white transition">
                US plans
              </Link>
            </li>
            <li>
              <Link href="/plans" className="hover:text-white transition">
                International
              </Link>
            </li>
            <li>
              <Link href="/#how" className="hover:text-white transition">
                How it works
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Account</p>
          <ul className="mt-4 space-y-3 text-sm text-white/65">
            <li>
              <Link href="/auth" className="hover:text-white transition">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-white transition">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/dashboard/devices" className="hover:text-white transition">
                Devices &amp; QR
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">US lineup</p>
          <p className="mt-4 text-sm leading-relaxed text-white/45">
            1 · 3 · 5 · 10 · 20 · 50 · 100 GB · Unlimited
          </p>
          <p className="mt-3 text-sm text-white/45">T-Mobile · AT&amp;T · Verizon</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Weeble. All rights reserved.</p>
          <p>Pay-as-you-go eSIM · Instant install</p>
        </div>
      </div>
    </footer>
  );
}
