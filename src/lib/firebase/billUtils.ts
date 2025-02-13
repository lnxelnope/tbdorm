import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy, getDoc, writeBatch, limit } from 'firebase/firestore';
import { Bill, MeterReading, PaymentReceipt, PromptPayConfig, BankAccount, Payment, ApiResponse, BillSummary } from '@/types/bill';

interface CreateBillData {
  dormitoryId: string;
  roomNumber: string;
  tenantId: string;
  tenantName: string;
  month: number;
  year: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  items: {
    name: string;
    type: 'rent' | 'water' | 'electric' | 'other';
    amount: number;
    description?: string;
    unitPrice?: number;
    units?: number;
  }[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments: Payment[];
  notificationsSent: {
    initial: boolean;
    reminder: boolean;
    overdue: boolean;
  };
}

// Bills
export const createBill = async (dormitoryId: string, billData: CreateBillData): Promise<ApiResponse<Bill>> => {
  try {
    const billsRef = collection(db, 'dormitories', dormitoryId, 'bills');
    const docRef = await addDoc(billsRef, {
      ...billData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const bill: Bill = {
      id: docRef.id,
      dormitoryId: billData.dormitoryId,
      roomNumber: billData.roomNumber,
      tenantId: billData.tenantId,
      tenantName: billData.tenantName,
      month: billData.month,
      year: billData.year,
      dueDate: billData.dueDate,
      status: billData.status,
      items: billData.items,
      totalAmount: billData.totalAmount,
      paidAmount: billData.paidAmount,
      remainingAmount: billData.remainingAmount,
      payments: billData.payments,
      notificationsSent: billData.notificationsSent,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      success: true,
      data: bill
    };
  } catch (error) {
    console.error('Error creating bill:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างบิล'
    };
  }
};

export const getBillsByDormitory = async (dormitoryId: string) => {
  try {
    const billsRef = collection(db, 'dormitories', dormitoryId, 'bills');
    const q = query(billsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const bills = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      data: bills
    };
  } catch (error) {
    console.error('Error getting bills:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบิล'
    };
  }
};

export const updateBill = async (billId: string, updates: Partial<Bill>) => {
  try {
    const billRef = doc(db, 'bills', billId);
    await updateDoc(billRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating bill:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดตบิล'
    };
  }
};

export const updateBillStatus = async (dormitoryId: string, billId: string, data: {
  status: Bill['status'];
  paidAmount: number;
  remainingAmount: number;
}) => {
  try {
    const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billId}`);
    await updateDoc(billRef, {
      status: data.status,
      paidAmount: data.paidAmount,
      remainingAmount: data.remainingAmount,
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating bill status:', error);
    return { success: false, error };
  }
};

// Meter Readings
export const saveMeterReading = async (reading: Omit<MeterReading, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const readingData = {
      ...reading,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'meter_readings'), readingData);
    return { success: true, data: { id: docRef.id, ...readingData } };
  } catch (error) {
    console.error('Error saving meter reading:', error);
    return { success: false, error };
  }
};

export const getMeterReadings = async (dormitoryId: string, roomId: string, type: 'water' | 'electric') => {
  try {
    const q = query(
      collection(db, 'meter_readings'),
      where('dormitoryId', '==', dormitoryId),
      where('roomId', '==', roomId),
      where('type', '==', type),
      orderBy('readingDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const readings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MeterReading[];
    return { success: true, data: readings };
  } catch (error) {
    console.error('Error getting meter readings:', error);
    return { success: false, error };
  }
};

// PromptPay Configuration
export const savePromptPayConfig = async (config: Omit<PromptPayConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const configData = {
      ...config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'promptpay_configs'), configData);
    return { success: true, data: { id: docRef.id, ...configData } };
  } catch (error) {
    console.error('Error saving PromptPay config:', error);
    return { success: false, error };
  }
};

export const getPromptPayConfig = async (dormitoryId: string) => {
  try {
    const q = query(
      collection(db, 'promptpay_configs'),
      where('dormitoryId', '==', dormitoryId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: true, data: null };
    }
    
    const config = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as unknown as PromptPayConfig;
    return { success: true, data: config };
  } catch (error) {
    console.error('Error getting PromptPay config:', error);
    return { success: false, error };
  }
};

// Payment Receipts
export const createPaymentReceipt = async (receipt: Omit<PaymentReceipt, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const receiptData = {
      ...receipt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'payment_receipts'), receiptData);
    return { success: true, data: { id: docRef.id, ...receiptData } };
  } catch (error) {
    console.error('Error creating payment receipt:', error);
    return { success: false, error };
  }
};

// Bank Account Management
export const saveBankAccount = async (account: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const accountData = {
      ...account,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'bank_accounts'), accountData);
    return { success: true, data: { id: docRef.id, ...accountData } };
  } catch (error) {
    console.error('Error saving bank account:', error);
    return { success: false, error };
  }
};

export const getBankAccounts = async (dormitoryId: string) => {
  try {
    const q = query(
      collection(db, 'bank_accounts'),
      where('dormitoryId', '==', dormitoryId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BankAccount[];
    return { success: true, data: accounts };
  } catch (error) {
    console.error('Error getting bank accounts:', error);
    return { success: false, error };
  }
};

export const updateBankAccount = async (accountId: string, data: Partial<BankAccount>) => {
  try {
    const accountRef = doc(db, 'bank_accounts', accountId);
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(accountRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating bank account:', error);
    return { success: false, error };
  }
};

export const deleteBankAccount = async (accountId: string) => {
  try {
    const accountRef = doc(db, 'bank_accounts', accountId);
    await updateDoc(accountRef, {
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return { success: false, error };
  }
};

export const addPayment = async (dormitoryId: string, payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const paymentData = {
      ...payment,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, `dormitories/${dormitoryId}/payments`), paymentData);
    return { success: true, data: { id: docRef.id, ...paymentData } };
  } catch (error) {
    console.error('Error adding payment:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันสำหรับดึงบิลเดี่ยว
export const getBill = async (dormitoryId: string, billId: string) => {
  try {
    const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billId}`);
    const billSnap = await getDoc(billRef);
    
    if (!billSnap.exists()) {
      return { success: false, error: 'Bill not found' };
    }

    const data = billSnap.data();
    return {
      success: true,
      data: {
        id: billSnap.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        dueDate: data.dueDate.toDate(),
        paidAt: data.paidAt?.toDate()
      } as Bill
    };
  } catch (error) {
    console.error('Error getting bill:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันสำหรับดึงการชำระเงินของบิล
export const getBillPayments = async (dormitoryId: string, billId: string) => {
  try {
    const paymentsRef = collection(db, `dormitories/${dormitoryId}/payments`);
    const q = query(
      paymentsRef,
      where('billId', '==', billId),
      orderBy('paidAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paidAt: doc.data().paidAt.toDate(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Payment[];

    return { success: true, data: payments };
  } catch (error) {
    console.error('Error getting bill payments:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันสำหรับลบบิล
export const deleteBill = async (dormitoryId: string, billId: string) => {
  try {
    // ลบการชำระเงินที่เกี่ยวข้องก่อน
    const paymentsResult = await getBillPayments(dormitoryId, billId);
    if (paymentsResult.success) {
      const batch = writeBatch(db);
      paymentsResult.data.forEach(payment => {
        const paymentRef = doc(db, `dormitories/${dormitoryId}/payments/${payment.id}`);
        batch.delete(paymentRef);
      });
      
      // ลบบิล
      const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billId}`);
      batch.delete(billRef);
      
      await batch.commit();
      return { success: true };
    }
    return { success: false, error: 'Failed to get payments' };
  } catch (error) {
    console.error('Error deleting bill:', error);
    return { success: false, error };
  }
};

export const getBillingSummary = async (dormitoryId: string): Promise<ApiResponse<BillSummary>> => {
  try {
    const billsResult = await getBillsByDormitory(dormitoryId);
    if (!billsResult.success) {
      throw new Error('Failed to get bills');
    }

    const summary: BillSummary = {
      totalBills: 0,
      totalAmount: 0,
      paidBills: 0,
      paidAmount: 0,
      pendingBills: 0,
      pendingAmount: 0,
      overdueBills: 0,
      overdueAmount: 0
    };

    billsResult.data.forEach(bill => {
      summary.totalBills++;
      summary.totalAmount += bill.totalAmount;

      switch (bill.status) {
        case 'paid':
          summary.paidBills++;
          summary.paidAmount += bill.totalAmount;
          break;
        case 'pending':
          summary.pendingBills++;
          summary.pendingAmount += bill.remainingAmount;
          break;
        case 'overdue':
          summary.overdueBills++;
          summary.overdueAmount += bill.remainingAmount;
          break;
      }
    });

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting billing summary:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันสำหรับตรวจสอบบิลที่เกินกำหนด
export const checkOverdueBills = async (dormitoryId: string) => {
  try {
    const billsRef = collection(db, `dormitories/${dormitoryId}/bills`);
    const q = query(
      billsRef,
      where('status', 'in', ['pending', 'partially_paid']),
      where('dueDate', '<', Timestamp.now())
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let updatedCount = 0;

    snapshot.docs.forEach(doc => {
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

    return { success: true, data: { updatedCount } };
  } catch (error) {
    console.error('Error checking overdue bills:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันสำหรับสร้างบิลประจำเดือน
export const createMonthlyBills = async (
  dormitoryId: string,
  data: {
    month: number;
    year: number;
    dueDate: Date;
    roomIds: string[];
  }
) => {
  try {
    const batch = writeBatch(db);
    let createdCount = 0;

    for (const roomId of data.roomIds) {
      const billRef = doc(collection(db, `dormitories/${dormitoryId}/bills`));
      const billData = {
        dormitoryId,
        roomId,
        month: data.month,
        year: data.year,
        dueDate: Timestamp.fromDate(data.dueDate),
        status: 'pending',
        items: [],
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        payments: [],
        notificationsSent: {
          initial: false,
          reminder: false,
          overdue: false
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      batch.set(billRef, billData);
      createdCount++;
    }

    await batch.commit();
    return { success: true, data: { createdCount } };
  } catch (error) {
    console.error('Error creating monthly bills:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันสำหรับดึงประวัติการชำระเงินของห้อง
export const getRoomPaymentHistory = async (dormitoryId: string, roomId: string) => {
  try {
    const billsRef = collection(db, `dormitories/${dormitoryId}/bills`);
    const q = query(
      billsRef,
      where('roomId', '==', roomId),
      orderBy('createdAt', 'desc'),
      limit(12) // ดึง 12 เดือนล่าสุด
    );
    
    const snapshot = await getDocs(q);
    const bills = await Promise.all(
      snapshot.docs.map(async doc => {
        const bill = {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate(),
          dueDate: doc.data().dueDate.toDate()
        } as Bill;

        // ดึงประวัติการชำระเงินของแต่ละบิล
        const paymentsResult = await getBillPayments(dormitoryId, doc.id);
        return {
          ...bill,
          payments: paymentsResult.success ? paymentsResult.data : []
        };
      })
    );

    return { success: true, data: bills };
  } catch (error) {
    console.error('Error getting room payment history:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันคำนวณค่าปรับ
export const calculateLateFee = async (dormitoryId: string, billId: string) => {
  try {
    const billResult = await getBill(dormitoryId, billId);
    if (!billResult.success || !billResult.data) {
      return { success: false, error: 'Bill not found' };
    }

    const bill = billResult.data;
    if (bill.status !== 'overdue') {
      return { success: true, data: { lateFee: 0 } };
    }

    // คำนวณจำนวนวันที่เกินกำหนด
    const dueDate = new Date(bill.dueDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // คำนวณค่าปรับ (ตัวอย่าง: 20 บาทต่อวัน)
    const lateFee = diffDays * 20;

    // อัพเดทบิล
    const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billId}`);
    await updateDoc(billRef, {
      lateFee,
      updatedAt: Timestamp.now()
    });

    return { success: true, data: { lateFee, diffDays } };
  } catch (error) {
    console.error('Error calculating late fee:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันสำหรับการส่งแจ้งเตือนบิล
export const sendBillNotifications = async (dormitoryId: string) => {
  try {
    const billsRef = collection(db, `dormitories/${dormitoryId}/bills`);
    const today = new Date();
    
    // ดึงบิลที่ใกล้ครบกำหนด (3 วันก่อนครบกำหนด)
    const dueSoonDate = new Date();
    dueSoonDate.setDate(today.getDate() + 3);
    
    const q = query(
      billsRef,
      where('status', 'in', ['pending', 'partially_paid']),
      where('dueDate', '<=', Timestamp.fromDate(dueSoonDate))
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let notificationCount = 0;

    snapshot.docs.forEach(doc => {
      const bill = doc.data();
      const dueDate = bill.dueDate.toDate();
      
      // ตรวจสอบว่าควรส่งแจ้งเตือนประเภทใด
      if (!bill.notificationsSent.initial && dueDate > today) {
        batch.update(doc.ref, {
          'notificationsSent.initial': true,
          updatedAt: Timestamp.now()
        });
        notificationCount++;
      } else if (!bill.notificationsSent.reminder && dueDate.getTime() - today.getTime() <= 3 * 24 * 60 * 60 * 1000) {
        batch.update(doc.ref, {
          'notificationsSent.reminder': true,
          updatedAt: Timestamp.now()
        });
        notificationCount++;
      } else if (!bill.notificationsSent.overdue && dueDate < today) {
        batch.update(doc.ref, {
          'notificationsSent.overdue': true,
          status: 'overdue',
          updatedAt: Timestamp.now()
        });
        notificationCount++;
      }
    });

    if (notificationCount > 0) {
      await batch.commit();
    }

    return { success: true, data: { notificationCount } };
  } catch (error) {
    console.error('Error sending bill notifications:', error);
    return { success: false, error };
  }
}; 