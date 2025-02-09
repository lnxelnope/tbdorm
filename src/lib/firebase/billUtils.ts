import { db } from './firebaseConfig';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { Bill, MeterReading, PaymentReceipt, PromptPayConfig, BankAccount } from '@/types/bill';

// Bills
export const createBill = async (bill: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const billData = {
      ...bill,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'bills'), billData);
    return { success: true, data: { id: docRef.id, ...billData } };
  } catch (error) {
    console.error('Error creating bill:', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการสร้างบิล' };
  }
};

export const getBillsByDormitory = async (dormitoryId: string) => {
  try {
    const billsRef = collection(db, 'bills');
    const q = query(
      billsRef,
      where('dormitoryId', '==', dormitoryId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const bills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Bill[];

    return {
      success: true,
      data: bills
    };
  } catch (error) {
    console.error('Error getting bills:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลบิล'
    };
  }
};

export const updateBill = async (billId: string, updates: Partial<Bill>) => {
  try {
    const billRef = doc(db, 'bills', billId);
    await updateDoc(billRef, {
      ...updates,
      updatedAt: new Date()
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

export const updateBillStatus = async (billId: string, status: Bill['status'], updates: Partial<Bill>) => {
  try {
    const billRef = doc(db, 'bills', billId);
    await updateDoc(billRef, {
      status,
      ...updates,
      updatedAt: new Date()
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating bill status:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะบิล'
    };
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