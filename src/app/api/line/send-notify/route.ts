import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    console.log('Request payload for LINE Notify API:', { message });

    if (!message) {
      return NextResponse.json(
        { error: 'กรุณาระบุข้อความ' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีการตั้งค่า LINE_NOTIFY_TOKEN ใน environment variables หรือไม่
    const lineNotifyToken = process.env.LINE_NOTIFY_TOKEN;
    console.log('Checking for LINE_NOTIFY_TOKEN:', lineNotifyToken ? 'Found' : 'Not found');
    console.log('All env variables:', Object.keys(process.env).filter(key => key.includes('LINE')));
    
    if (!lineNotifyToken) {
      console.log('LINE_NOTIFY_TOKEN not found');
      // ลองใช้ค่าคงที่แทนเพื่อทดสอบ
      const hardcodedToken = 'XV21p4KkIjsKo2D6ii058j8Uif9WwvZ1q7crbuWn27T';
      
      // สร้าง payload สำหรับส่งไปยัง LINE Notify API
      const formData = new URLSearchParams();
      formData.append('message', message);
      
      console.log('Sending to LINE Notify API with hardcoded token:', message);
      
      try {
        // ส่งข้อมูลไปยัง LINE Notify API
        const lineResponse = await fetch('https://notify-api.line.me/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${hardcodedToken}`
          },
          body: formData.toString()
        });
        
        console.log('LINE Notify API response status:', lineResponse.status);
        
        const responseText = await lineResponse.text();
        console.log('LINE Notify API response text:', responseText);
        
        let lineResponseData;
        try {
          lineResponseData = JSON.parse(responseText);
          console.log('LINE Notify API response data:', lineResponseData);
        } catch (e) {
          console.log('Failed to parse LINE Notify API response as JSON');
          lineResponseData = { rawText: responseText };
        }
        
        if (!lineResponse.ok) {
          return NextResponse.json(
            { 
              error: `LINE Notify API Error: ${responseText}`,
              details: lineResponseData
            },
            { status: lineResponse.status }
          );
        }

        return NextResponse.json({ 
          success: true,
          note: 'ส่งข้อความผ่าน LINE Notify API สำเร็จ (ใช้ token คงที่)'
        });
      } catch (error) {
        console.error('Error sending to LINE Notify API:', error);
        return NextResponse.json(
          { error: `เกิดข้อผิดพลาดในการเชื่อมต่อกับ LINE Notify API: ${error}` },
          { status: 500 }
        );
      }
    }

    // สร้าง payload สำหรับส่งไปยัง LINE Notify API
    const formData = new URLSearchParams();
    formData.append('message', message);
    
    console.log('Sending to LINE Notify API:', message);
    
    try {
      // ส่งข้อมูลไปยัง LINE Notify API
      const lineResponse = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${lineNotifyToken}`
        },
        body: formData.toString()
      });
      
      console.log('LINE Notify API response status:', lineResponse.status);
      
      const responseText = await lineResponse.text();
      console.log('LINE Notify API response text:', responseText);
      
      let lineResponseData;
      try {
        lineResponseData = JSON.parse(responseText);
        console.log('LINE Notify API response data:', lineResponseData);
      } catch (e) {
        console.log('Failed to parse LINE Notify API response as JSON');
        lineResponseData = { rawText: responseText };
      }
      
      if (!lineResponse.ok) {
        return NextResponse.json(
          { 
            error: `LINE Notify API Error: ${responseText}`,
            details: lineResponseData
          },
          { status: lineResponse.status }
        );
      }

      return NextResponse.json({ 
        success: true,
        note: 'ส่งข้อความผ่าน LINE Notify API สำเร็จ'
      });
    } catch (error) {
      console.error('Error sending to LINE Notify API:', error);
      return NextResponse.json(
        { error: `เกิดข้อผิดพลาดในการเชื่อมต่อกับ LINE Notify API: ${error}` },
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