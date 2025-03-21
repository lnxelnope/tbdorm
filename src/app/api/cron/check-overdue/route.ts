import { adminDb } from '../../../../lib/firebase/firebase-admin';
import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';

// API Route สำหรับตรวจสอบบิลที่เลยกำหนดชำระ
// ควรตั้ง Cron Job ให้เรียก API นี้ทุกวันเวลาเที่ยงคืน
export async function GET() {
  try {
    const billsRef = adminDb.collection('dormitories');
    const dormitoriesSnapshot = await billsRef.get();

    for (const dormDoc of dormitoriesSnapshot.docs) {
      const dormitoryId = dormDoc.id;
      const billsRef = adminDb.collection(`dormitories/${dormitoryId}/bills`);
      const q = billsRef.where('status', 'in', ['pending', 'partially_paid'])
                       .where('dueDate', '<', Timestamp.now());

      const billsSnapshot = await q.get();
      const batch = adminDb.batch();
      let updatedCount = 0;

      billsSnapshot.docs.forEach(doc => {
        const billRef = doc.ref;
        batch.update(billRef, {
          status: 'overdue',
          updatedAt: Timestamp.now()
        });
        updatedCount++;
      });

      if (updatedCount > 0) {
        await batch.commit();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error checking overdue bills:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 