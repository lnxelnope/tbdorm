import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { updateOverdueBillsAndTenants } from "@/lib/firebase/billUtils";

// API Route สำหรับตรวจสอบบิลที่เลยกำหนดชำระ
// ควรตั้ง Cron Job ให้เรียก API นี้ทุกวันเวลาเที่ยงคืน
export async function GET() {
  try {
    // ดึงรายการหอพักทั้งหมด
    const dormitoriesRef = collection(db, "dormitories");
    const dormitoriesSnap = await getDocs(dormitoriesRef);
    
    const results = [];
    
    // อัพเดทสถานะบิลและผู้เช่าที่ค้างชำระของแต่ละหอพัก
    for (const dormDoc of dormitoriesSnap.docs) {
      const result = await updateOverdueBillsAndTenants(dormDoc.id);
      results.push({
        dormitoryId: dormDoc.id,
        ...result
      });
    }
    
    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error checking overdue bills:", error);
    return NextResponse.json({
      success: false,
      error: "ไม่สามารถตรวจสอบบิลที่เลยกำหนดชำระได้"
    }, { status: 500 });
  }
} 