import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardNav } from '@/components/DashboardNav';
import { SignOutButton } from './SignOutButton';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/auth?next=/dashboard');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-weeble-400">Dashboard</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-50">Your Weeble</h1>
          <p className="text-sm text-ink-400">Signed in as {session.name || session.email}</p>
        </div>
        <SignOutButton />
      </div>
      <DashboardNav />
      {children}
    </div>
  );
}
