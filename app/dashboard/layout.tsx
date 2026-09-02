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
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Signed in as {session.name || session.email}
          </p>
        </div>
        <SignOutButton />
      </div>
      <DashboardNav />
      {children}
    </div>
  );
}
