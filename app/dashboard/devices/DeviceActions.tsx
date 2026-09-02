'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';

export function DeviceActions({
  id,
  nickname,
  status,
}: {
  id: string;
  nickname: string;
  status: string;
}) {
  const [name, setName] = useState(nickname);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save(patch: { nickname?: string; status?: string }) {
    setBusy(true);
    try {
      await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[180px] flex-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nickname" />
      </div>
      <Button variant="secondary" disabled={busy || name === nickname} onClick={() => save({ nickname: name })}>
        Save nickname
      </Button>
      {status !== 'active' && (
        <Button disabled={busy} onClick={() => save({ status: 'active' })}>
          Mark installed
        </Button>
      )}
    </div>
  );
}
