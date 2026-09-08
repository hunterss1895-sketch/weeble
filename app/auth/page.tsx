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
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink-500">Account</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Welcome to Weeble</h1>
        <p className="mt-3 text-sm text-ink-500">
          Sign in or create your Weeble account to buy data credit and manage your eSIM.
        </p>
      </div>
      <AuthForm next={next || '/dashboard'} />
    </div>
  );
}
