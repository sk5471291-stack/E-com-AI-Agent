import { NextRequest, NextResponse } from 'next/server';
import { askAgent } from '@/lib/gemini';
import { logInteraction } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const startTime = Date.now();
    const result = await askAgent(message, history || []);
    const latency = ((Date.now() - startTime) / 1000).toFixed(2);

    logInteraction({
      type: 'chat_query',
      details: `User Query: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}" | Responded in ${latency}s`,
      statusBadge: 'COMPLETED'
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      latency,
      refundData: result.refundData,
      orderData: result.orderData,
      productData: result.productData,
      sheetUpdated: result.sheetUpdated
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error in Chat API'
    }, { status: 500 });
  }
}
