import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const limit = parseInt(url.searchParams.get('limit') || '1024');
  const resolvedParams = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: resolvedParams.id },
    select: { feedback: true, status: true }
  });

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (submission.status !== 'ERROR' && submission.status !== 'FAILED') {
    return NextResponse.json({ error: 'No raw output for successful submission' }, { status: 400 });
  }

  const rawText = submission.feedback || '';
  const totalLength = rawText.length;
  
  const chunkStr = rawText.substring(offset, offset + limit);

  return NextResponse.json({ 
    chunk: chunkStr,
    totalLength: totalLength,
    nextOffset: offset + limit,
    isFinished: offset + limit >= totalLength
  });
}
