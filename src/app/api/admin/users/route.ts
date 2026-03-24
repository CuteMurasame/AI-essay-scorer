import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, credits: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(users);
}
