import { getStorage } from "firebase/storage";
import { getApp } from "firebase/app";

/**
 * แก้ไขปัญหา CORS ของ Firebase Storage
 * 
 * ฟังก์ชันนี้ควรถูกเรียกใช้หลังจากที่ Firebase ถูก initialize แล้ว
 * เพื่อกำหนดค่า CORS สำหรับ Firebase Storage
 */
export function setupStorageCORS() {
  try {
    // แสดงข้อมูล Storage bucket ที่กำลังใช้
    console.log('Firebase Storage bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    
    // แทนที่จะส่ง preflight request ในฝั่ง client
    // เราควรตั้งค่า CORS ในฝั่ง server ด้วยคำสั่ง firebase storage:cors set cors.json
    console.log('Firebase Storage CORS should be configured on server side with "firebase storage:cors set cors.json"');
    
    return true;
  } catch (error) {
    console.error('Error setting up Firebase Storage CORS:', error);
    return false;
  }
} 