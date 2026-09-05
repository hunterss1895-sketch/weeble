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
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-weeble-400">Account</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-ink-50">Welcome to Weeble</h1>
        <p className="mt-3 text-sm text-ink-400">
          Sign in or create your Weeble account to buy a plan and manage your eSIM.
        </p>
      </div>
      <AuthForm next={next || '/dashboard'} />
    </div>
  );
}
