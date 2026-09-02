'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'signout' }),
        });
        router.push('/');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
