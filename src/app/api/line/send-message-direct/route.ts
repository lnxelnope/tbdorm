import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json();
    console.log('Request payload for LINE direct API:', { userId, message });

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'กรุณาระบุ userId และ message' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีการตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน environment variables หรือไม่
    const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!lineChannelAccessToken) {
      console.log('LINE_CHANNEL_ACCESS_TOKEN not found');
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN ไม่ได้ถูกกำหนดในไฟล์ .env' },
        { status: 500 }
      );
    }

    console.log('LINE_CHANNEL_ACCESS_TOKEN:', lineChannelAccessToken.substring(0, 10) + '...');

    // สร้าง payload สำหรับส่งไปยัง LINE Messaging API
    const linePayload = {
      to: userId,
      messages: [
        {
          type: 'text',
          text: message
        }
      ]
    };
    
    console.log('Sending to LINE Messaging API:', JSON.stringify(linePayload));
    
    try {
      // ส่งข้อมูลไปยัง LINE Messaging API
      const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lineChannelAccessToken}`
        },
        body: JSON.stringify(linePayload),
      });
      
      console.log('LINE API response status:', lineResponse.status);
      
      let lineResponseData;
      const responseText = await lineResponse.text();
      console.log('LINE API response text:', responseText);
      
      try {
        lineResponseData = JSON.parse(responseText);
        console.log('LINE API response data:', lineResponseData);
      } catch (e) {
        console.log('Failed to parse LINE API response as JSON');
        lineResponseData = { rawText: responseText };
      }
      
      if (!lineResponse.ok) {
        return NextResponse.json(
          { 
            error: `LINE API Error: ${JSON.stringify(lineResponseData)}`,
            details: lineResponseData
          },
          { status: lineResponse.status }
        );
      }

      return NextResponse.json({ 
        success: true,
        note: 'ส่งข้อความผ่าน LINE API สำเร็จ'
      });
    } catch (error) {
      console.error('Error sending to LINE API:', error);
      return NextResponse.json(
        { error: `เกิดข้อผิดพลาดในการเชื่อมต่อกับ LINE API: ${error}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการประมวลผลคำขอ' },
      { status: 500 }
    );
  }
} 