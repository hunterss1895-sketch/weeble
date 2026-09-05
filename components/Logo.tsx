import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-ink-50 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-weeble-500 text-base font-black text-ink-950 shadow-[0_0_24px_rgba(245,197,24,0.35)]">
        W
      </span>
      <span className="text-xl tracking-tight">
        Weeble<span className="text-weeble-500">.</span>
      </span>
    </Link>
  );
}
