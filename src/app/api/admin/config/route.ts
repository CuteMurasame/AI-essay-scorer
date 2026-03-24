import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getUser();
  const isAdmin = user?.role === 'ADMIN';

  const configs = await prisma.aIConfig.findMany({ orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'asc' }] });
  
  // Calculate average response time for each config
  const configsWithStats = await Promise.all(configs.map(async (config) => {
    const stats = await prisma.submission.aggregate({
      where: {
        level: config.id,
        status: 'DONE',
        responseTime: { not: null }
      },
      _avg: {
        responseTime: true
      }
    });

    const baseData = isAdmin ? config : { 
      id: config.id, 
      name: config.name, 
      displayName: config.displayName, 
      creditCost: config.creditCost,
      model: config.model 
    };

    return {
      ...baseData,
      avgResponseTime: stats._avg.responseTime || 0
    };
  }));

  return NextResponse.json(configsWithStats);
}

export async function POST(req: Request) {
  const user = await getUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, displayName, apiKey, endpoint, model, creditCost } = body;
    if (!name || !apiKey || !endpoint || !model) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }
    const config = await prisma.aIConfig.create({
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

export async function PUT(req: Request) {
  const user = await getUser();
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, name, displayName, apiKey, endpoint, model, creditCost } = body;
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
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
