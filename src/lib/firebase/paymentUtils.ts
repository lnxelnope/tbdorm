import { db } from './firebase';
import { doc, updateDoc, addDoc, collection, Timestamp, getDoc, arrayUnion, query, where, getDocs } from 'firebase/firestore';
import { ApiResponse } from '@/types/api';

/**
 * บันทึกการชำระเงิน
 * @param dormitoryId - รหัสหอพัก
 * @param billId - รหัสบิล
 * @param paymentData - ข้อมูลการชำระเงิน
 * @returns ผลลัพธ์การบันทึกการชำระเงิน
 */
export async function recordPayment(
  dormitoryId: string,
  billId: string,
  paymentData: {
    amount: number;
    method: string;
    date: Date;
    notes?: string;
    slipUrl?: string;
    tenantId: string;
    recordedBy: string;
  }
): Promise<ApiResponse<{ paymentId: string; billStatus: string }>> {
  try {
    // ตรวจสอบข้อมูลบิลก่อน
    const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billId}`);
    const billDoc = await getDoc(billRef);
    
    if (!billDoc.exists()) {
      return {
        success: false,
        message: "ไม่พบข้อมูลบิล",
        error: "Bill not found"
      };
    }
    
    const billData = billDoc.data();
    
    // ตรวจสอบว่าบิลชำระเงินครบแล้วหรือไม่
    if (billData.status === 'paid') {
      return {
        success: false,
        message: "บิลนี้ชำระเงินครบแล้ว ไม่สามารถชำระเพิ่มได้",
        error: "Bill already paid"
      };
    }
    
    // สร้างข้อมูลการชำระเงิน
    const paymentRef = collection(db, `dormitories/${dormitoryId}/payments`);
    const newPayment = {
      billId,
      dormitoryId,
      tenantId: paymentData.tenantId,
      amount: Number(paymentData.amount),
      method: paymentData.method,
      paidAt: Timestamp.fromDate(paymentData.date),
      recordedBy: paymentData.recordedBy,
      notes: paymentData.notes || null,
      slipUrl: paymentData.slipUrl || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    // บันทึกการชำระเงิน
    const paymentDoc = await addDoc(paymentRef, newPayment);
    
    // เพิ่มข้อมูลการชำระเงินในบิล
    const billPayment = {
      id: paymentDoc.id,
      amount: Number(paymentData.amount),
      method: paymentData.method,
      date: paymentData.date,
      recordedBy: paymentData.recordedBy,
      createdBy: paymentData.recordedBy,
      createdAt: new Date().toISOString(),
      slipUrl: paymentData.slipUrl || null,
      notes: paymentData.notes || null
    };
    
    // ตรวจสอบว่ามีการชำระเงินที่มี id เดียวกันอยู่แล้วหรือไม่
    const existingPayments = billData.payments || [];
    const paymentExists = existingPayments.some((payment: any) => payment.id === paymentDoc.id);
    
    if (!paymentExists) {
      // อัปเดตข้อมูลการชำระเงินในบิล
      await updateDoc(billRef, {
        payments: arrayUnion(billPayment)
      });
    }
    
    // อัปเดตข้อมูลบิล
    const billDataUpdated = await updateBillAfterPayment(dormitoryId, billId, Number(paymentData.amount));
    
    return {
      success: true,
      message: "บันทึกการชำระเงินเรียบร้อยแล้ว",
      data: {
        paymentId: paymentDoc.id,
        billStatus: billDataUpdated.status
      }
    };
  } catch (error) {
    console.error("Error recording payment:", error);
    return {
      success: false,
      message: "ไม่สามารถบันทึกการชำระเงินได้",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * อัปเดตสถานะบิลหลังจากชำระเงิน
 * @param dormitoryId - รหัสหอพัก
 * @param billId - รหัสบิล
 * @param paymentAmount - จำนวนเงินที่ชำระ
 * @returns ข้อมูลบิลที่อัปเดตแล้ว
 */
async function updateBillAfterPayment(
  dormitoryId: string,
  billId: string,
  paymentAmount: number
): Promise<{ status: string; paidAmount: number }> {
  // ดึงข้อมูลบิล
  const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billId}`);
  const billDoc = await getDoc(billRef);
  const billData = billDoc.data();
  
  if (!billData) {
    throw new Error("ไม่พบข้อมูลบิล");
  }
  
  // คำนวณยอดชำระเงินทั้งหมด
  const currentPaidAmount = billData.paidAmount || 0;
  const newPaidAmount = currentPaidAmount + paymentAmount;
  const remainingAmount = billData.totalAmount - newPaidAmount;
  
  // กำหนดสถานะบิลใหม่
  let newStatus = billData.status;
  if (newPaidAmount >= billData.totalAmount) {
    // ถ้าชำระเงินครบแล้ว ให้เปลี่ยนสถานะเป็น "paid" ไม่ว่าสถานะเดิมจะเป็นอะไรก็ตาม
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    // ถ้าชำระเงินบางส่วน ให้เปลี่ยนสถานะเป็น "partially_paid"
    // แต่ถ้าเป็น "overdue" อยู่แล้ว ให้คงสถานะเดิมไว้
    if (billData.status !== 'overdue') {
      newStatus = 'partially_paid';
    }
  }
  
  // อัปเดตบิล
  await updateDoc(billRef, {
    paidAmount: newPaidAmount,
    remainingAmount: remainingAmount,
    status: newStatus,
    updatedAt: Timestamp.now()
  });
  
  return {
    status: newStatus,
    paidAmount: newPaidAmount
  };
} 