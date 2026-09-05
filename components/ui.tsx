import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants = {
    primary: 'bg-weeble-500 text-ink-950 hover:bg-weeble-400 shadow-[0_0_0_1px_rgba(245,197,24,0.35)] font-semibold',
    secondary: 'bg-ink-900 text-weeble-400 border border-weeble-500/40 hover:bg-ink-800 hover:border-weeble-400',
    ghost: 'bg-transparent text-weeble-400 hover:bg-weeble-500/10',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weeble-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 outline-none focus:border-weeble-500 focus:ring-2 focus:ring-weeble-500/30',
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-3xl border border-ink-800 bg-ink-900/80 p-6 shadow-xl shadow-black/20', className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'yellow',
}: {
  children: ReactNode;
  tone?: 'yellow' | 'blue' | 'green' | 'amber' | 'slate';
}) {
  const tones = {
    yellow: 'bg-weeble-500 text-ink-950 ring-weeble-400/40',
    blue: 'bg-weeble-500/15 text-weeble-400 ring-weeble-500/30',
    green: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    amber: 'bg-weeble-500 text-ink-950 ring-weeble-400/40',
    slate: 'bg-ink-800 text-ink-300 ring-ink-700',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ring-1 ring-inset', tones[tone])}>
      {children}
    </span>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-ink-300">{children}</label>;
}
