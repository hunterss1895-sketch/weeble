import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center text-[15px] font-semibold uppercase tracking-[0.22em] text-white ${className}`}
    >
      Weeble
    </Link>
  );
}
