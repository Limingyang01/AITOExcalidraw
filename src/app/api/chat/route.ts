import { NextRequest } from 'next/server';
import { createChatStream } from '@/services/aiService';
import { logRequest } from '@/services/logger';
import { Message } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const provider = 'deepseek';

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    const body = await req.json();
    const messages: Message[] = body.messages;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chatStream = createChatStream(messages);

          for await (const chunk of chatStream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          logRequest({
            timestamp: new Date().toISOString(),
            ip,
            userAgent,
            messages,
            provider,
            responseTime: Date.now() - startTime,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.close();

          logRequest({
            timestamp: new Date().toISOString(),
            ip,
            userAgent,
            messages,
            provider,
            responseTime: Date.now() - startTime,
            error: errorMessage,
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid request';

    logRequest({
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
      messages: [],
      provider,
      responseTime: Date.now() - startTime,
      error: errorMessage,
    });

    return Response.json({ error: errorMessage }, { status: 400 });
  }
}
