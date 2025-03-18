import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy, getDoc, writeBatch, limit, deleteDoc } from 'firebase/firestore';
import { Bill, MeterReading, PaymentReceipt, PromptPayConfig, BankAccount, Payment, ApiResponse, BillSummary } from '@/types/bill';
import { getBillingConditions, deletePaymentSlipsByBillId } from './firebaseUtils';

interface CreateBillData {
  dormitoryId: string;
  roomId: string;
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
export const createBill = async (
  dormitoryId: string, 
  billData: CreateBillData,
  forceCreate: boolean = false
): Promise<ApiResponse<Bill>> => {
  try {
    if (!dormitoryId) {
      return { success: false, error: 'dormitoryId is required' };
    }
    
    if (!billData) {
      return { success: false, error: 'billData is required' };
    }

    console.log(`Creating bill for dormitory ${dormitoryId}, room ${billData.roomNumber}, forceCreate: ${forceCreate}`);

    // ตรวจสอบบิลซ้ำเฉพาะเมื่อไม่ได้บังคับสร้าง
    if (!forceCreate) {
      // ตรวจสอบว่ามีบิลของห้องนี้ในเดือนเดียวกันแล้วหรือไม่
      const billsRef = collection(db, `dormitories/${dormitoryId}/bills`);
      const q = query(
        billsRef,
        where('roomNumber', '==', billData.roomNumber),
        where('month', '==', billData.month),
        where('year', '==', billData.year)
      );
      
      const existingBills = await getDocs(q);
      
      if (!existingBills.empty) {
        return {
          success: false,
          error: `มีบิลของห้อง ${billData.roomNumber} สำหรับเดือน ${billData.month}/${billData.year} อยู่แล้ว`
        };
      }
    }

    // สร้างบิลใหม่
    const billRef = collection(db, `dormitories/${dormitoryId}/bills`);
    const newBill = {
      dormitoryId,
      roomId: billData.roomId,
      roomNumber: billData.roomNumber,
      tenantId: billData.tenantId,
      tenantName: billData.tenantName,
      month: billData.month,
      year: billData.year,
      dueDate: Timestamp.fromDate(billData.dueDate),
      status: billData.status,
      items: billData.items,
      totalAmount: billData.totalAmount,
      paidAmount: billData.paidAmount || 0,
      remainingAmount: billData.remainingAmount || billData.totalAmount,
      payments: billData.payments || [],
      notificationsSent: billData.notificationsSent || {
        initial: false,
        reminder: false,
        overdue: false
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(billRef, newBill);
    
    // อัปเดตสถานะห้องเป็น pending_payment
    try {
      // ค้นหาห้องจากเลขห้อง
      const roomsRef = collection(db, 'dormitories', dormitoryId, 'rooms');
      const roomQuery = query(roomsRef, where('number', '==', billData.roomNumber));
      const roomSnapshot = await getDocs(roomQuery);
      
      if (!roomSnapshot.empty) {
        const roomDoc = roomSnapshot.docs[0];
        const roomRef = doc(db, 'dormitories', dormitoryId, 'rooms', roomDoc.id);
        
        // อัปเดตสถานะห้องและบันทึกรหัสบิลล่าสุด
        await updateDoc(roomRef, {
          status: 'pending_payment',
          latestBillId: docRef.id,
          updatedAt: Timestamp.now()
        });
      }
    } catch (roomUpdateError) {
      console.error('Error updating room status:', roomUpdateError);
      // ไม่ return error เพราะบิลถูกสร้างแล้ว
    }
    
    // ดึงข้อมูลบิลที่สร้างเพื่อส่งกลับ
    const billDoc = await getDoc(docRef);
    const createdBill = {
      id: docRef.id,
      ...billDoc.data()
    } as Bill;
    
    return {
      success: true,
      data: createdBill
    };
  } catch (error) {
    console.error('Error creating bill:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างบิล: ' + (error instanceof Error ? error.message : String(error))
    };
  }
};

/**
 * สร้างบิลหลายรายการพร้อมกันโดยใช้ batch operation
 * @param dormitoryId - รหัสหอพัก
 * @param billsData - ข้อมูลบิลที่ต้องการสร้าง
 * @param forceCreate - บังคับสร้างบิลแม้จะมีบิลในเดือนเดียวกันแล้ว
 * @returns ผลลัพธ์การสร้างบิล
 */
export const createBills = async (
  dormitoryId: string,
  billsData: CreateBillData[],
  forceCreate: boolean = false
): Promise<ApiResponse<Bill[]>> => {
  try {
    if (!dormitoryId) {
      return { success: false, error: 'dormitoryId is required' };
    }
    
    if (!billsData || billsData.length === 0) {
      return { success: false, error: 'No bills to create' };
    }

    console.log(`Creating ${billsData.length} bills for dormitory ${dormitoryId}, forceCreate: ${forceCreate}`);

    const createdBills: Bill[] = [];
    const duplicateBills: string[] = [];
    const batch = writeBatch(db);
    const roomUpdates = new Map<string, string>(); // เก็บ roomId และ billId ที่ต้องอัปเดต

    // ตรวจสอบบิลซ้ำเฉพาะเมื่อไม่ได้บังคับสร้าง
    if (!forceCreate) {
      for (const billData of billsData) {
        try {
          const billsRef = collection(db, 'dormitories', dormitoryId, 'bills');
          const q = query(
            billsRef,
            where('roomNumber', '==', billData.roomNumber),
            where('month', '==', billData.month),
            where('year', '==', billData.year)
          );
          
          const existingBillsSnapshot = await getDocs(q);
          
          if (!existingBillsSnapshot.empty) {
            duplicateBills.push(billData.roomNumber);
          }
        } catch (error) {
          console.error(`Error checking duplicate bill for room ${billData.roomNumber}:`, error);
          // ไม่ throw error เพื่อให้ตรวจสอบห้องอื่นต่อไปได้
        }
      }
      
      // ถ้ามีบิลซ้ำและไม่ได้บังคับสร้าง ให้ส่งคืนข้อผิดพลาด
      if (duplicateBills.length > 0) {
        return { 
          success: false, 
          error: `มีบิลสำหรับห้อง ${duplicateBills.join(', ')} ในเดือนนี้อยู่แล้ว` 
        };
      }
    }

    // สร้างบิลทั้งหมดใน batch
    for (const billData of billsData) {
      try {
        const billsRef = collection(db, 'dormitories', dormitoryId, 'bills');
        const newBillRef = doc(billsRef);
        const now = new Date();
        
        const billWithTimestamp = {
          ...billData,
          createdAt: now,
          updatedAt: now
        };
        
        batch.set(newBillRef, billWithTimestamp);
        
        // เตรียมข้อมูลบิลที่สร้าง
        const bill: Bill = {
          id: newBillRef.id,
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
          createdAt: now,
          updatedAt: now
        };
        
        createdBills.push(bill);
        
        // ค้นหาห้องจากเลขห้องเพื่ออัปเดต latestBillId
        try {
          const roomsRef = collection(db, 'dormitories', dormitoryId, 'rooms');
          const q = query(roomsRef, where('number', '==', billData.roomNumber));
          const roomSnapshot = await getDocs(q);
          
          if (!roomSnapshot.empty) {
            const roomDoc = roomSnapshot.docs[0];
            const roomId = roomDoc.id;
            
            // เก็บข้อมูลห้องที่ต้องอัปเดต
            roomUpdates.set(roomId, newBillRef.id);
          }
        } catch (roomError) {
          console.error(`Error finding room ${billData.roomNumber}:`, roomError);
          // ไม่ throw error เพราะการสร้างบิลยังดำเนินต่อไปได้
        }
      } catch (billError) {
        console.error(`Error preparing bill for room ${billData.roomNumber}:`, billError);
        // ไม่ throw error เพื่อให้สร้างบิลห้องอื่นต่อไปได้
      }
    }
    
    if (createdBills.length === 0) {
      return { success: false, error: 'No bills were created' };
    }
    
    // อัปเดต latestBillId ในข้อมูลห้อง
    try {
      roomUpdates.forEach((billId, roomId) => {
        const roomRef = doc(db, 'dormitories', dormitoryId, 'rooms', roomId);
        batch.update(roomRef, {
          latestBillId: billId,
          updatedAt: new Date()
        });
      });
      
      // ดำเนินการสร้างบิลและอัปเดตห้องทั้งหมดพร้อมกัน
      await batch.commit();
      
      console.log(`Successfully created ${createdBills.length} bills`);
      
      return {
        success: true,
        data: createdBills
      };
    } catch (batchError) {
      console.error('Error committing batch:', batchError);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้างบิล: ' + (batchError instanceof Error ? batchError.message : String(batchError))
      };
    }
  } catch (error) {
    console.error('Error creating bills:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างบิล: ' + (error instanceof Error ? error.message : String(error))
    };
  }
};

export const getBillsByDormitory = async (dormitoryId: string) => {
  try {
    const billsRef = collection(db, 'dormitories', dormitoryId, 'bills');
    const q = query(billsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const bills = querySnapshot.docs.map(billDoc => {
      const data = billDoc.data();
      
      // แปลง Timestamp เป็น string
      const processedData: any = {
        id: billDoc.id,
        ...data
      };
      
      // แปลง createdAt และ updatedAt
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        processedData.createdAt = data.createdAt.toDate().toISOString();
      }
      
      if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
        processedData.updatedAt = data.updatedAt.toDate().toISOString();
      }
      
      // แปลง dueDate
      if (data.dueDate && typeof data.dueDate.toDate === 'function') {
        processedData.dueDate = data.dueDate.toDate().toISOString();
      }
      
      // แปลง Timestamp ในรายการชำระเงิน
      if (Array.isArray(processedData.payments)) {
        // กรองรายการชำระเงินที่ซ้ำกัน (ถ้ามี)
        const uniquePaymentIds = new Set();
        processedData.payments = processedData.payments
          .filter((payment: any) => {
            // ถ้าไม่มี id ให้ใช้ได้
            if (!payment.id) return true;
            
            // ถ้ามี id และยังไม่เคยมี ให้เพิ่มและใช้ได้
            if (!uniquePaymentIds.has(payment.id)) {
              uniquePaymentIds.add(payment.id);
              return true;
            }
            
            // ถ้ามี id และเคยมีแล้ว ให้ข้าม
            return false;
          })
          .map((payment: any) => {
            const processedPayment = { ...payment };
            
            if (payment.date && typeof payment.date.toDate === 'function') {
              processedPayment.date = payment.date.toDate().toISOString();
            }
            
            if (payment.paidAt && typeof payment.paidAt.toDate === 'function') {
              processedPayment.paidAt = payment.paidAt.toDate().toISOString();
            }
            
            if (payment.createdAt && typeof payment.createdAt.toDate === 'function') {
              processedPayment.createdAt = payment.createdAt.toDate().toISOString();
            }
            
            if (payment.updatedAt && typeof payment.updatedAt.toDate === 'function') {
              processedPayment.updatedAt = payment.updatedAt.toDate().toISOString();
            }
            
            return processedPayment;
          });
          
        // คำนวณยอดชำระเงินใหม่จากรายการชำระเงินที่ไม่ซ้ำกัน
        const totalPaid = processedData.payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
        
        // ตรวจสอบว่ายอดชำระเงินที่คำนวณใหม่แตกต่างจากที่บันทึกไว้หรือไม่
        if (Math.abs(totalPaid - processedData.paidAmount) > 0.01) {
          console.warn(`Bill ${billDoc.id} has incorrect paidAmount. Calculated: ${totalPaid}, Stored: ${processedData.paidAmount}`);
          
          // อัปเดตยอดชำระเงินและยอดคงเหลือ
          processedData.paidAmount = totalPaid;
          processedData.remainingAmount = processedData.totalAmount - totalPaid;
          
          // อัปเดตสถานะบิลตามยอดชำระเงินที่คำนวณใหม่
          if (totalPaid >= processedData.totalAmount) {
            processedData.status = 'paid';
          } else if (totalPaid > 0) {
            processedData.status = 'partially_paid';
          } else {
            // คงสถานะเดิมถ้ายังไม่มีการชำระเงิน
          }
          
          // อัปเดตข้อมูลในฐานข้อมูล
          try {
            const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billDoc.id}`);
            updateDoc(billRef, {
              paidAmount: totalPaid,
              remainingAmount: processedData.totalAmount - totalPaid,
              status: processedData.status,
              updatedAt: Timestamp.now()
            }).then(() => {
              console.log(`Updated bill ${billDoc.id} with correct payment amounts`);
            }).catch(err => {
              console.error(`Failed to update bill ${billDoc.id}:`, err);
            });
          } catch (updateError) {
            console.error(`Error updating bill ${billDoc.id}:`, updateError);
          }
        }
      }
      
      return processedData;
    });

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
  remainingAmount?: number;
}): Promise<ApiResponse<void>> => {
  try {
    const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billId}`);
    
    // อัปเดตสถานะบิล
    const updateData: Record<string, any> = {
      status: data.status,
      paidAmount: data.paidAmount,
      updatedAt: Timestamp.now()
    };
    
    // ถ้ามี remainingAmount ให้อัปเดตด้วย
    if (data.remainingAmount !== undefined) {
      updateData.remainingAmount = data.remainingAmount;
    }
    
    await updateDoc(billRef, updateData);
    
    // ดึงข้อมูลบิลเพื่อหาเลขห้องและรหัสผู้เช่า
    const billDoc = await getDoc(billRef);
    if (!billDoc.exists()) {
      throw new Error('Bill not found');
    }
    
    const billData = billDoc.data() as Record<string, any>;
    const roomNumber = billData.roomNumber;
    const tenantId = billData.tenantId;
    
    // ค้นหาห้องจากเลขห้อง
    const roomsRef = collection(db, 'dormitories', dormitoryId, 'rooms');
    const q = query(roomsRef, where('number', '==', roomNumber));
    const roomSnapshot = await getDocs(q);
    
    if (!roomSnapshot.empty) {
      const roomDoc = roomSnapshot.docs[0];
      const roomRef = doc(db, 'dormitories', dormitoryId, 'rooms', roomDoc.id);
      
      // กำหนดสถานะห้องตามสถานะบิล
      let newRoomStatus: string;
      
      if (data.status === 'paid') {
        // ถ้าชำระเงินครบแล้ว ให้เปลี่ยนสถานะเป็น occupied
        newRoomStatus = 'occupied';
      } else if (data.status === 'partially_paid') {
        // ถ้าชำระเงินบางส่วน ให้คงสถานะ pending_payment
        newRoomStatus = 'pending_payment';
      } else if (data.status === 'pending') {
        // ถ้ายังไม่ชำระเงิน ให้คงสถานะ pending_payment
        newRoomStatus = 'pending_payment';
      } else {
        // สถานะอื่นๆ ให้คงสถานะเดิม
        newRoomStatus = roomDoc.data().status;
      }
      
      // อัปเดตสถานะห้อง
      await updateDoc(roomRef, {
        status: newRoomStatus,
        updatedAt: new Date()
      });
      
      console.log(`Updated room ${roomNumber} status to ${newRoomStatus} based on bill status ${data.status}`);
      
      // ถ้ามีการชำระเงิน (paid หรือ partially_paid) ให้อัปเดตข้อมูลผู้เช่า
      if (data.status === 'paid' || data.status === 'partially_paid') {
        // ดึงข้อมูลการชำระเงินล่าสุด
        const paymentsRef = collection(db, `dormitories/${dormitoryId}/payments`);
        const paymentsQuery = query(
          paymentsRef,
          where('billId', '==', billId),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        
        const paymentsSnapshot = await getDocs(paymentsQuery);
        
        if (!paymentsSnapshot.empty) {
          const latestPayment = paymentsSnapshot.docs[0].data() as Record<string, any>;
          const paymentDate = latestPayment.paidAt || latestPayment.createdAt;
          const paymentMethod = latestPayment.method;
          
          // อัปเดตข้อมูลผู้เช่า
          if (tenantId) {
            const tenantRef = doc(db, 'dormitories', dormitoryId, 'tenants', tenantId);
            const tenantDoc = await getDoc(tenantRef);
            
            if (tenantDoc.exists()) {
              const remainingAmount = data.remainingAmount !== undefined ? data.remainingAmount : 0;
              
              await updateDoc(tenantRef, {
                lastPaymentDate: paymentDate,
                lastPaymentMethod: paymentMethod,
                outstandingBalance: remainingAmount > 0 ? remainingAmount : 0,
                updatedAt: new Date()
              });
              
              console.log(`Updated tenant ${tenantId} with payment info`);
            }
          }
        }
      }
    } else {
      console.warn(`Room ${roomNumber} not found when updating status based on bill`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating bill status:', error);
    return { success: false, error: error as Error };
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

/**
 * ลบบิลและรูปภาพที่เกี่ยวข้อง
 * @param dormitoryId - รหัสหอพัก
 * @param billId - รหัสบิล
 * @returns ผลลัพธ์การลบบิล
 */
export async function deleteBill(dormitoryId: string, billId: string): Promise<ApiResponse> {
  try {
    // เรียกใช้ deleteBills แทนการทำงานเอง
    const result = await deleteBills(dormitoryId, [billId]);
    
    if (!result.success) {
      return {
        success: false,
        message: "ไม่สามารถลบบิลได้",
        error: result.error
      };
    }
    
    return {
      success: true,
      message: "ลบบิลและข้อมูลการชำระเงินที่เกี่ยวข้องเรียบร้อยแล้ว"
    };
  } catch (error) {
    console.error("Error deleting bill:", error);
    return {
      success: false,
      message: "ไม่สามารถลบบิลได้",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// เพิ่มฟังก์ชันสำหรับลบบิลหลายรายการพร้อมกัน
export const deleteBills = async (dormitoryId: string, billIds: string[]): Promise<ApiResponse<boolean>> => {
  try {
    if (!dormitoryId || !billIds || billIds.length === 0) {
      return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
    }

    const batch = writeBatch(db);
    
    // ลบบิลทั้งหมดใน batch
    for (const billId of billIds) {
      const billRef = doc(db, 'dormitories', dormitoryId, 'bills', billId);
      batch.delete(billRef);
      
      try {
        // ลบรูปสลิปการชำระเงินที่เกี่ยวข้องกับบิล
        await deletePaymentSlipsByBillId(dormitoryId, billId);
      } catch (slipError) {
        console.error(`Error deleting payment slips for bill ${billId}:`, slipError);
        // ไม่ throw error เพื่อให้การลบบิลดำเนินต่อไปได้แม้ว่าการลบรูปจะล้มเหลว
        
        // ตรวจสอบว่าเป็นข้อผิดพลาด CORS หรือไม่
        if (slipError instanceof Error && 
            (slipError.message.includes('CORS') || 
             slipError.message.includes('access control') || 
             slipError.message.includes('cross-origin'))) {
          console.warn('CORS error detected when deleting payment slips.');
          console.warn('This might be due to CORS configuration issues with Firebase Storage.');
          console.warn('The bills will still be deleted from the database, but payment slip images might remain in storage.');
        }
      }
    }
    
    // ดำเนินการลบทั้งหมด
    await batch.commit();
    
    return { success: true, data: true };
  } catch (error) {
    console.error('Error deleting bills:', error);
    return { 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการลบบิล: ' + (error instanceof Error ? error.message : String(error))
    };
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
          summary.paidAmount += bill.paidAmount;
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

    // ดึงค่า lateFeeRate จากการตั้งค่า
    const billingConditionsResult = await getBillingConditions(dormitoryId);
    if (!billingConditionsResult.success || !billingConditionsResult.data) {
      console.error('Error getting billing conditions');
      // ใช้ค่าเริ่มต้น 2% ถ้าไม่สามารถดึงค่าจากการตั้งค่าได้
      const lateFeeRate = 2;
      
      // คำนวณจำนวนวันที่เกินกำหนด
      const dueDate = new Date(bill.dueDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // คำนวณค่าปรับ (ค่าเริ่มต้น: 2% ของยอดรวม)
      const lateFee = Math.ceil(bill.totalAmount * (lateFeeRate / 100));

      // อัพเดทบิล
      const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billId}`);
      await updateDoc(billRef, {
        lateFee,
        updatedAt: Timestamp.now()
      });

      return { success: true, data: { lateFee, diffDays, lateFeeRate } };
    }
    
    // ใช้ค่า lateFeeRate จากการตั้งค่า
    const lateFeeRate = billingConditionsResult.data.lateFeeRate || 2; // ค่าเริ่มต้น 2% ถ้าไม่ได้ตั้งค่า
    
    // คำนวณจำนวนวันที่เกินกำหนด
    const dueDate = new Date(bill.dueDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // คำนวณค่าปรับ (ใช้ lateFeeRate จากการตั้งค่า)
    const lateFee = Math.ceil(bill.totalAmount * (lateFeeRate / 100));

    // อัพเดทบิล
    const billRef = doc(db, `dormitories/${dormitoryId}/bills/${billId}`);
    await updateDoc(billRef, {
      lateFee,
      updatedAt: Timestamp.now()
    });

    return { success: true, data: { lateFee, diffDays, lateFeeRate } };
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