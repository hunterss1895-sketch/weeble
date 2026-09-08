import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 font-semibold tracking-tight text-ink-50 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-ink-700 bg-ink-950 text-sm font-bold text-white">
        W
      </span>
      <span className="text-lg tracking-tight">
        Weeble<span className="text-ink-500">.</span>
      </span>
    </Link>
  );
}
