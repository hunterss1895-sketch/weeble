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
      <h1 className="text-center text-3xl font-bold text-slate-900">Welcome to Weeble</h1>
      <p className="mt-2 text-center text-sm text-slate-500">
        Sign in or create an account. Demo: demo@weeble.com / demo1234
      </p>
      <div className="mt-8">
        <AuthForm next={next || '/dashboard'} />
      </div>
    </div>
  );
}
