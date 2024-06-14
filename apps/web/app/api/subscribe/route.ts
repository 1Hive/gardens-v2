import { ChangeTopic, subscribe } from '@/utils/pubsub';
import { ServerResponse } from 'http';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const topics = req.nextUrl.searchParams.getAll('topics') as ChangeTopic[];
  if (!topics || topics.length === 0) {
    return new NextResponse('Topic query parameter is required', { status: 400 });
  }
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const res = new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });

  const sendData = (data: string) => {
    writer.write(`data: ${data}\n\n`);
  };

  subscribe(topics, {
    write: sendData,
    end: () => writer.close(),
    on: (event: string, callback: () => void) => {
      if (event === 'close') {
        writer.closed.then(callback);
      }
    },
  } as unknown as ServerResponse);

  return res;
}
