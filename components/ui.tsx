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
    primary: 'bg-white text-black hover:bg-white/90 font-semibold',
    secondary: 'bg-white/10 text-white hover:bg-white/15 border border-transparent',
    ghost: 'bg-transparent text-white/60 hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-lg',
    lg: 'px-6 py-3 text-[13px] font-semibold rounded-xl',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white',
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
        'w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30',
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl bg-zinc-900 p-6 sm:p-8', className)}>{children}</div>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'yellow' | 'blue' | 'green' | 'amber' | 'slate';
}) {
  const tones = {
    yellow: 'bg-white text-black',
    blue: 'bg-white/10 text-white/70',
    green: 'bg-white/10 text-white/70',
    amber: 'bg-white/10 text-white/70',
    slate: 'bg-white/10 text-white/60',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
      {children}
    </label>
  );
}
