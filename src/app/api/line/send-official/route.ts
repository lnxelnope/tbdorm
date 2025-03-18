import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, message, quoteToken } = await req.json();
    console.log('Request payload for LINE Official API:', { userId, message, quoteToken });

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'กรุณาระบุ userId และ message' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีการตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน environment variables หรือไม่
    const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'LWkGTqsqvGJv96ifjjNQEAjxtZTqqm4/zYXbSgmPD0KwrE20ZJPdXVc1Dlht+9mbAECQnY5Rlngcc1yCvIPuYLb54e9QX11hDA+qOkdNjyMHgyvYJqfngU/Qk+5Ci9WCjhN8jOP1/VucJqemOy+08gdB04t89/1O/w1cDnyilFU=';
    
    if (!lineChannelAccessToken) {
      console.log('LINE_CHANNEL_ACCESS_TOKEN not found');
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN ไม่ได้ถูกกำหนดในไฟล์ .env' },
        { status: 500 }
      );
    }

    console.log('LINE_CHANNEL_ACCESS_TOKEN:', lineChannelAccessToken.substring(0, 10) + '...');

    // สร้าง payload สำหรับส่งไปยัง LINE Messaging API
    const messageObject: any = {
      type: 'text',
      text: message
    };

    // เพิ่ม quoteToken ถ้ามี
    if (quoteToken) {
      messageObject.quoteToken = quoteToken;
    }

    const linePayload = {
      to: userId,
      messages: [messageObject]
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
      
      const responseText = await lineResponse.text();
      console.log('LINE API response text:', responseText);
      
      let lineResponseData;
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
            error: `LINE API Error: ${responseText}`,
            details: lineResponseData
          },
          { status: lineResponse.status }
        );
      }

      return NextResponse.json({ 
        success: true,
        note: 'ส่งข้อความผ่าน LINE API สำเร็จ',
        response: lineResponseData
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