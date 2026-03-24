import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  // Do not allow deleting BASE config
  const config = await prisma.aIConfig.findUnique({ where: { id } });
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (config.name === 'BASE') return NextResponse.json({ error: '不能删除 BASE 配置' }, { status: 400 });

  await prisma.aIConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, displayName, apiKey, endpoint, model, creditCost } = body;

  try {
    const config = await prisma.aIConfig.update({
      where: { id },
      data: {
        name,
        displayName: displayName || name,
        apiKey,
        endpoint,
        model,
        creditCost: parseInt(creditCost || '0'),
      },
    });
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
