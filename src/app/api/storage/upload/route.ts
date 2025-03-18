import { NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    if (!file || !path) {
      return NextResponse.json({ error: 'File and path are required' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(path);

    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    });

    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500'
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 