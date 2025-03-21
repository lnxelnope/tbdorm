import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '@firebase/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    
    if (!file || !path) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์หรือพาธที่จะอัปโหลด' },
        { status: 400 }
      );
    }
    
    // อ่านไฟล์เป็น ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // อัปโหลดไฟล์ไปยัง Firebase Storage
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const fullPath = `${path}/${filename}`;
    
    // ตั้งค่า metadata
    const metadata = {
      contentType: file.type,
      metadata: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Content-Length, Content-Encoding, Content-Disposition'
      }
    };
    
    // อัปโหลดไฟล์
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(fullPath);
    
    await fileRef.save(buffer, {
      metadata: metadata,
      contentType: file.type,
      public: true
    });
    
    // ดึง URL ของไฟล์
    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // วันหมดอายุที่ไกลมาก
    });
    
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถอัปโหลดไฟล์ได้' },
      { status: 500 }
    );
  }
} 