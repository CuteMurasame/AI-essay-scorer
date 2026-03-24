import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, role: true, credits: true }
  });

  return NextResponse.json(userData);
}
