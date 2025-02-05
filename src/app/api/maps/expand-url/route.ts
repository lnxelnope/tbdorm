import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // ส่ง request ไปยัง URL เพื่อรับ URL ที่ถูก redirect
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow'
    });

    // ได้ URL เต็มจากการ redirect
    const fullUrl = response.url;

    return NextResponse.json({ url: fullUrl });
  } catch (error) {
    console.error('Error expanding URL:', error);
    return NextResponse.json(
      { error: "Failed to expand URL" },
      { status: 500 }
    );
  }
} 