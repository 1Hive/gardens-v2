import { publish } from '@/utils/pubsub';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, res: NextResponse) {
  const { context } = await req.json();

  if (context) {
    publish(context);
    return NextResponse.json(
      { ok: true }
    );
  } else {
    return NextResponse.json(
      { error: 'Invalid topic or message' },
      { status: 400 }
    );
  }
}
