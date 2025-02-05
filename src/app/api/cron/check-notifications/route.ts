import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import {
  sendBillDueReminderNotification,
  sendBillOverdueNotification,
} from "@/lib/notifications/lineNotify";
import { Bill, LineNotifyConfig } from "@/types/dormitory";

// ฟังก์ชันสำหรับดึงข้อมูลบิลที่ใกล้ครบกำหนดชำระ (3 วันก่อนครบกำหนด)
const getDueBills = async () => {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const bills: Bill[] = [];
  const dormitoriesSnapshot = await getDocs(collection(db, "dormitories"));

  for (const dormDoc of dormitoriesSnapshot.docs) {
    const billsRef = collection(db, `dormitories/${dormDoc.id}/bills`);
    const q = query(
      billsRef,
      where("status", "in", ["pending", "partially_paid"]),
      where("dueDate", "<=", Timestamp.fromDate(threeDaysFromNow)),
      where("dueDate", ">", Timestamp.fromDate(now))
    );

    const billsSnapshot = await getDocs(q);
    bills.push(
      ...billsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bill[]
    );
  }

  return bills;
};

// ฟังก์ชันสำหรับดึงข้อมูลบิลที่เลยกำหนดชำระ
const getOverdueBills = async () => {
  const now = new Date();

  const bills: Bill[] = [];
  const dormitoriesSnapshot = await getDocs(collection(db, "dormitories"));

  for (const dormDoc of dormitoriesSnapshot.docs) {
    const billsRef = collection(db, `dormitories/${dormDoc.id}/bills`);
    const q = query(
      billsRef,
      where("status", "in", ["pending", "partially_paid"]),
      where("dueDate", "<", Timestamp.fromDate(now))
    );

    const billsSnapshot = await getDocs(q);
    bills.push(
      ...billsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bill[]
    );
  }

  return bills;
};

// ฟังก์ชันสำหรับดึงการตั้งค่า LINE Notify ของหอพัก
const getLineNotifyConfig = async (dormitoryId: string) => {
  const docRef = collection(db, `dormitories/${dormitoryId}/settings`);
  const snapshot = await getDocs(docRef);
  const config = snapshot.docs.find((doc) => doc.id === "lineNotify");
  if (config && config.exists()) {
    return { id: config.id, ...config.data() } as LineNotifyConfig;
  }
  return null;
};

export async function GET() {
  try {
    // ตรวจสอบ Authorization header (ถ้าต้องการ)
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // ดึงข้อมูลบิลที่ใกล้ครบกำหนดชำระ
    const dueBills = await getDueBills();
    for (const bill of dueBills) {
      const config = await getLineNotifyConfig(bill.dormitoryId);
      if (config) {
        await sendBillDueReminderNotification(config, bill);
      }
    }

    // ดึงข้อมูลบิลที่เลยกำหนดชำระ
    const overdueBills = await getOverdueBills();
    for (const bill of overdueBills) {
      const config = await getLineNotifyConfig(bill.dormitoryId);
      if (config) {
        await sendBillOverdueNotification(config, bill);
      }
    }

    return NextResponse.json({
      success: true,
      dueBills: dueBills.length,
      overdueBills: overdueBills.length,
    });
  } catch (error) {
    console.error("Error checking notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 