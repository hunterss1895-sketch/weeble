import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AuthForm } from './AuthForm';

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  const { next } = await searchParams;
  if (session) redirect(next || '/dashboard');

  return (
    <div className="px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">Account</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Welcome to Weeble
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/45">
          Sign in or create your account to order data plans and manage your eSIM.
        </p>
        <div className="mt-10">
          <AuthForm next={next || '/dashboard'} />
        </div>
      </div>
    </div>
  );
}
