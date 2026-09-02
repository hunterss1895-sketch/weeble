import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            US-first eSIM marketplace. Instant QR activation, watch ads for free data, and manage devices in one dashboard.
          </p>
        </div>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} Weeble. Demo MVP.</p>
      </div>
    </footer>
  );
}
