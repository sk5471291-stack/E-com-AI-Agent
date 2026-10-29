import { NextRequest, NextResponse } from 'next/server';
import { evaluateRefundEligibility } from '@/lib/refund-engine';

export async function POST(req: NextRequest) {
  try {
    const { orderId, autoEmail } = await req.json();

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const result = await evaluateRefundEligibility(orderId, autoEmail !== false);

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      evaluation: result.evaluation
    });
  } catch (error: any) {
    console.error('Refund API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
