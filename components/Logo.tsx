import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center font-semibold uppercase tracking-[0.18em] text-white ${className}`}
    >
      <span className="text-sm sm:text-[15px]">Weeble</span>
    </Link>
  );
}
