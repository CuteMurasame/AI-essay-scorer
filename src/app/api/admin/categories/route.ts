import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getUser();
  const isAdmin = user?.role === 'ADMIN';

  if (isAdmin) {
    const cats = await prisma.categoryConfig.findMany({ orderBy: { updatedAt: 'asc' } });
    return NextResponse.json(cats);
  } else {
    const cats = await prisma.categoryConfig.findMany({
      select: { id: true, name: true, displayName: true, defaultFull: true },
      orderBy: { updatedAt: 'asc' },
    });
    return NextResponse.json(cats);
  }
}

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, displayName, defaultFull, extraPrompt } = body;
    if (!name) return NextResponse.json({ error: '缺少 name' }, { status: 400 });
    const cat = await prisma.categoryConfig.create({
      data: {
        name,
        displayName: displayName || name,
        defaultFull: parseInt(defaultFull || '100'),
        extraPrompt: extraPrompt || '',
      },
    });
    return NextResponse.json(cat);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, name, displayName, defaultFull, extraPrompt } = body;
    
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

    const cat = await prisma.categoryConfig.update({
      where: { id },
      data: {
        name,
        displayName: displayName || name,
        defaultFull: parseInt(defaultFull || '100'),
        extraPrompt: extraPrompt || '',
      },
    });
    return NextResponse.json(cat);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
