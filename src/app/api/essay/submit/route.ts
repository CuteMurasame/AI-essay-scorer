import { prisma } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { scoreEssayStream } from '@/lib/ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, text, configId, standard, essayImages, topicImages, fullScore, language } = await req.json();

    const userData = await prisma.user.findUnique({ where: { id: user.id } });
    const config = await prisma.aIConfig.findUnique({ where: { id: configId } });

    if (!userData || !config) return NextResponse.json({ error: '配置缺失' }, { status: 400 });

    let finalFull = parseInt(fullScore);
    if (isNaN(finalFull)) {
      const catConfig = await prisma.categoryConfig.findFirst({ where: { name: standard } });
      finalFull = catConfig?.defaultFull || 100;
    }

    if (userData.credits < config.creditCost) {
      return NextResponse.json({ error: '积分不足' }, { status: 402 });
    }

    const submission = await prisma.submission.create({
      data: {
        userId: user.id,
        title,
        content: text,
        topicImageUrls: JSON.stringify(topicImages || []),
        imageUrls: JSON.stringify(essayImages || []),
        standard,
        level: configId,
        language: language || '中文',
        fullScore: finalFull,
        creditCost: config.creditCost,
        status: 'PROCESSING'
      }
    });

    // Deduct credits immediately
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: config.creditCost } }
    });

    // Fire-and-forget streaming score
    (async () => {
      try {
        await scoreEssayStream(
          submission.id,
          title || '',
          text || '',
          configId,
          standard,
          essayImages || [],
          topicImages || [],
          finalFull,
          language || '中文',
          config.creditCost
        );
      } catch (err) {
        console.error('scoreEssayStream error:', err);
      }
    })();

    return NextResponse.json({ id: submission.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
