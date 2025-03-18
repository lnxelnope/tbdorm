import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = formData.get('userId') as string;
    const image = formData.get('image') as File;
    
    console.log('Request payload:', { userId, image: image?.name });

    if (!userId || !image) {
      return NextResponse.json(
        { error: 'กรุณาระบุ userId และ image' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีการตั้งค่า MAKE_WEBHOOK_URL ใน environment variables หรือไม่
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    
    if (!makeWebhookUrl) {
      console.log('MAKE_WEBHOOK_URL not found');
      return NextResponse.json(
        { error: 'MAKE_WEBHOOK_URL ไม่ได้ถูกกำหนดในไฟล์ .env' },
        { status: 500 }
      );
    }

    // สร้าง payload สำหรับส่งไปยัง Make.com webhook
    const makePayload = {
      action: 'sendImage',
      data: {
        userId: userId,
        type: 'image',
        imageName: image.name,
        imageType: image.type,
        imageSize: image.size,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Sending to Make.com webhook:', makePayload);
    
    // ส่งข้อมูลไปยัง Make.com webhook
    const makeResponse = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(makePayload),
    });
    
    const makeResponseText = await makeResponse.text();
    console.log('Make.com webhook response status:', makeResponse.status);
    console.log('Make.com webhook response:', makeResponseText);
    
    let makeData;
    try {
      makeData = JSON.parse(makeResponseText);
    } catch (e) {
      console.log('Failed to parse response as JSON');
      makeData = { message: makeResponseText };
    }

    if (!makeResponse.ok) {
      return NextResponse.json(
        { error: `Make.com Webhook Error: ${makeData.message || makeResponseText || 'Unknown error'}` },
        { status: makeResponse.status }
      );
    }

    return NextResponse.json({ 
      success: true,
      note: 'ส่งรูปภาพผ่าน Make.com webhook สำเร็จ'
    });
  } catch (error) {
    console.error('Error sending image:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งรูปภาพ' },
      { status: 500 }
    );
  }
} 