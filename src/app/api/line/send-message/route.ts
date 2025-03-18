import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json();
    console.log('Request payload:', { userId, message });

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'กรุณาระบุ userId และ message' },
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
    // ส่งเฉพาะข้อความที่ต้องการ โดยไม่มี type
    const makePayload = {
      text: message,
      to: userId
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
    
    if (!makeResponse.ok) {
      return NextResponse.json(
        { error: `Make.com Webhook Error: ${makeResponseText || 'Unknown error'}` },
        { status: makeResponse.status }
      );
    }

    return NextResponse.json({ 
      success: true,
      note: 'ส่งผ่าน Make.com webhook สำเร็จ',
      response: makeResponseText
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการส่งข้อความ' },
      { status: 500 }
    );
  }
}