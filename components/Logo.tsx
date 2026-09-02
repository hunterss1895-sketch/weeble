import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-bold tracking-tight text-weeble-800 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-weeble-500 to-weeble-700 text-sm text-white shadow-sm">
        W
      </span>
      <span className="text-lg">Weeble</span>
    </Link>
  );
}
