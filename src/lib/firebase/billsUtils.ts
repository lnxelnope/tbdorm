import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface PromptPayConfig {
  promptPayId: string;
  promptPayName: string;
}

interface BankAccountConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface UpdateConfigResult {
  success: boolean;
  error?: string;
}

export const updatePromptPayConfig = async (config: PromptPayConfig): Promise<UpdateConfigResult> => {
  try {
    const configRef = doc(db, 'settings', 'payment');
    await setDoc(configRef, { promptPay: config }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating PromptPay config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    };
  }
};

export const updateBankAccountConfig = async (config: BankAccountConfig): Promise<UpdateConfigResult> => {
  try {
    const configRef = doc(db, 'settings', 'payment');
    await setDoc(configRef, { bankAccount: config }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating bank account config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    };
  }
};

export const getPaymentConfig = async () => {
  try {
    const configRef = doc(db, 'settings', 'payment');
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      return {
        success: true,
        data: configSnap.data()
      };
    }
    
    return {
      success: true,
      data: {}
    };
  } catch (error) {
    console.error('Error getting payment config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    };
  }
}; 