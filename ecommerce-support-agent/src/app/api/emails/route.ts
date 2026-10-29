import { NextResponse } from 'next/server';
import { getDispatchedEmails } from '@/lib/email-service';

export async function GET() {
  try {
    const emails = getDispatchedEmails();
    return NextResponse.json({
      success: true,
      data: emails
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
