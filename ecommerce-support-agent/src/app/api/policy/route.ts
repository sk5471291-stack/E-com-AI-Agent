import { NextRequest, NextResponse } from 'next/server';
import { parseDocxFile, getCachedPolicy } from '@/lib/docx-parser';
import { logInteraction } from '@/lib/sheets';

export async function GET() {
  try {
    const policy = await parseDocxFile();
    return NextResponse.json({
      success: true,
      data: policy
    });
  } catch (error: any) {
    console.error('Policy API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const policy = await parseDocxFile(undefined, buffer);

    logInteraction({
      type: 'chat_query',
      details: `New policy document loaded: "${file.name}" (${(file.size / 1024).toFixed(1)} KB) with ${policy.sections.length} policy sections.`,
      statusBadge: 'DOCX RELOADED'
    });

    return NextResponse.json({
      success: true,
      data: policy,
      message: `Successfully loaded and extracted ${file.name}`
    });
  } catch (error: any) {
    console.error('Policy Upload Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
