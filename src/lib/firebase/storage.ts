import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const uploadPaymentEvidence = async (
  dormitoryId: string,
  billId: string,
  file: File
) => {
  try {
    // สร้าง path สำหรับเก็บไฟล์ใน storage
    const path = `dormitories/${dormitoryId}/bills/${billId}/payments/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);

    // อัพโหลดไฟล์
    await uploadBytes(storageRef, file);

    // ดึง URL ของไฟล์
    const url = await getDownloadURL(storageRef);

    return { success: true, url };
  } catch (error) {
    console.error('Error uploading payment evidence:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันลบไฟล์หลักฐานการชำระเงิน (ถ้าจำเป็น)
export const deletePaymentEvidence = async (fileUrl: string) => {
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting payment evidence:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันสำหรับดึง URL ชั่วคราวของไฟล์ (ถ้าต้องการ)
export const getTemporaryUrl = async (fileUrl: string, expirationTime = 3600) => {
  try {
    const fileRef = ref(storage, fileUrl);
    const url = await getDownloadURL(fileRef);
    return { success: true, url };
  } catch (error) {
    console.error('Error getting temporary URL:', error);
    return { success: false, error };
  }
}; 