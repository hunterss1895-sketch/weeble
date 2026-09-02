import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export async function PATCH(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, nickname, status } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const device = await prisma.device.findFirst({ where: { id, userId: session.id } });
  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.device.update({
    where: { id },
    data: {
      ...(nickname != null ? { nickname } : {}),
      ...(status != null ? { status, installedAt: status === 'active' ? new Date() : device.installedAt } : {}),
    },
  });
  return NextResponse.json(updated);
}
