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
    primary: 'bg-white text-black hover:bg-ink-200 font-semibold border border-white',
    secondary: 'bg-transparent text-ink-200 border border-ink-700 hover:border-ink-400 hover:text-white',
    ghost: 'bg-transparent text-ink-400 hover:text-white hover:bg-ink-900',
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
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white',
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
        'w-full rounded-md border border-ink-800 bg-ink-950 px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 outline-none focus:border-ink-500',
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-ink-800 bg-ink-950 p-6', className)}>
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
    yellow: 'bg-white text-black ring-ink-700',
    blue: 'bg-ink-900 text-ink-300 ring-ink-700',
    green: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    amber: 'bg-ink-800 text-ink-200 ring-ink-700',
    slate: 'bg-ink-900 text-ink-400 ring-ink-800',
  };
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wide ring-1 ring-inset', tones[tone])}>
      {children}
    </span>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-ink-400">{children}</label>;
}
