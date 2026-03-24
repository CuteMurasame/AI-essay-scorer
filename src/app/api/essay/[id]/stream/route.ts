import { getUser } from '@/lib/auth';
import { getStream } from '@/lib/streamStore';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission || (submission.userId !== user.id && user.role !== 'ADMIN')) {
    return new Response('Not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let interval: any;
  let timeout: any;

  const stream = new ReadableStream({
    async start(controller) {
      let sent = 0;
      let isClosed = false;

      const safeClose = () => {
        if (isClosed) return;
        isClosed = true;
        try {
          controller.close();
        } catch (e) {
          // Ignore if already closed
        }
      };

      // Poll the in-memory store every 100ms
      interval = setInterval(() => {
        const entry = getStream(id);
        if (!entry) {
          // Stream not yet created or already GC'd; check DB status
          clearInterval(interval);
          clearTimeout(timeout);
          if (!isClosed) {
            controller.enqueue(encoder.encode('event: status\ndata: pending\n\n'));
            safeClose();
          }
          return;
        }

        // Send any new chunks
        while (sent < entry.chunks.length) {
          const chunk = entry.chunks[sent++];
          const escaped = JSON.stringify(chunk);
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(`event: chunk\ndata: ${escaped}\n\n`));
            } catch (e) {
              clearInterval(interval);
              clearTimeout(timeout);
              return;
            }
          }
        }

        if (entry.done) {
          clearInterval(interval);
          clearTimeout(timeout);
          if (!isClosed) {
            if (entry.error) {
              controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify(entry.error)}\n\n`));
            } else {
              controller.enqueue(encoder.encode('event: done\ndata: done\n\n'));
            }
            safeClose();
          }
        }
      }, 100);

      // Safety timeout: 5 minutes
      timeout = setTimeout(() => {
        clearInterval(interval);
        safeClose();
      }, 5 * 60 * 1000);
    },
    cancel() {
      clearInterval(interval);
      clearTimeout(timeout);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
