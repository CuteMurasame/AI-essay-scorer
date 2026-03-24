import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    // Support single: { userId, amount } or bulk: { userIds, amount }
    const { userId, userIds, amount } = body;
    const delta = parseInt(amount);
    if (isNaN(delta)) return NextResponse.json({ error: '无效金额' }, { status: 400 });

    const targets: string[] = userId ? [userId] : (userIds || []);
    if (targets.length === 0) return NextResponse.json({ error: '未指定用户' }, { status: 400 });

    const results = await Promise.all(
      targets.map(async (uid) => {
        const u = await prisma.user.findUnique({ where: { id: uid } });
        if (!u) return null;
        const newCredits = Math.max(0, u.credits + delta);
        return prisma.user.update({ where: { id: uid }, data: { credits: newCredits } });
      })
    );

    return NextResponse.json({ ok: true, updated: results.filter(Boolean).length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
