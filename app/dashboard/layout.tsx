import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardNav } from '@/components/DashboardNav';
import { SignOutButton } from './SignOutButton';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/auth?next=/dashboard');

  return (
    <div className="px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
              Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Your Weeble
            </h1>
            <p className="mt-2 text-sm text-white/45">Signed in as {session.name || session.email}</p>
          </div>
          <SignOutButton />
        </div>
        <DashboardNav />
        {children}
      </div>
    </div>
  );
}
