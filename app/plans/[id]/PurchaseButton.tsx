'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export function PurchaseButton({ planId, priceCents = 1 }: { planId: string; priceCents?: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const isFree = priceCents <= 0;

  async function buy() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purchase failed');
      router.push(`/dashboard/devices?purchased=${data.purchaseId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button className="w-full" size="lg" onClick={buy} disabled={loading}>
        {loading ? 'Activating…' : isFree ? 'Get free starter' : 'Buy Weeble plan'}
      </Button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
