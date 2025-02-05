import { db } from "../lib/firebase/firebaseConfig";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";

const initializeReadings = async () => {
  try {
    // ดึงข้อมูลหอพักทั้งหมด
    const dormitoriesSnapshot = await getDocs(collection(db, "dormitories"));
    
    for (const dormDoc of dormitoriesSnapshot.docs) {
      const dormitoryId = dormDoc.id;
      
      // ดึงข้อมูลห้องทั้งหมดของหอพัก
      const roomsSnapshot = await getDocs(collection(db, `dormitories/${dormitoryId}/rooms`));
      
      // เพิ่มค่าเริ่มต้นให้แต่ละห้อง
      for (const roomDoc of roomsSnapshot.docs) {
        const roomId = roomDoc.id;
        
        // เพิ่มค่ามิเตอร์ไฟฟ้าเดือนก่อนเป็น 100
        await addDoc(collection(db, `dormitories/${dormitoryId}/utility-readings`), {
          roomId,
          dormitoryId,
          type: "electric",
          previousReading: 100,
          currentReading: 100,
          readingDate: Timestamp.fromDate(new Date(new Date().setMonth(new Date().getMonth() - 1))), // ตั้งเป็นเดือนก่อน
          units: 0,
          createdAt: Timestamp.fromDate(new Date()),
          createdBy: "admin"
        });
      }
    }
    
    console.log("เพิ่มค่ามิเตอร์ไฟฟ้าเดือนก่อนเรียบร้อยแล้ว");
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
  }
};

initializeReadings(); 