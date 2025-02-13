import { auth, db } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult as _getRedirectResult,
  getAuth,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  query,
  orderBy,
  QueryConstraint,
  where,
  setDoc,
  writeBatch,
  collectionGroup,
  arrayUnion,
  Timestamp,
  limit,
} from "firebase/firestore";
import type { 
  Dormitory, 
  Room, 
  RoomType, 
  Tenant, 
  UtilityReading, 
  Bill, 
  Payment, 
  PromptPayConfig, 
  LineNotifyConfig,
  BillingConditions,
  AdditionalFeeItem
} from '@/types/dormitory';

// Constants
const COLLECTIONS = {
  DORMITORIES: 'dormitories',
  METER_READINGS: 'meter_readings',
  ROOMS: 'rooms',
  TENANTS: 'tenants',
};

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
    return true;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const handleRedirectResult = async () => {
  try {
    const result = await _getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error("Error getting redirect result:", error);
    throw error;
  }
};

// Dormitory functions
export interface DormitoryConfig {
  roomTypes: Record<string, RoomType>;
  additionalFees: {
    utilities: {
      water: {
        perPerson: number | null;
      };
      electric: {
        unit: number | null;
      };
    };
    items: AdditionalFeeItem[];
    floorRates: Record<string, number | null>;
  };
  createdAt: any;
  updatedAt: any;
}

export interface DormitoryData extends Omit<Dormitory, 'config'> {
  totalFloors?: number;
  floors?: number;
  facilities?: string[];
  status?: string;
  description?: string;
  phone?: string;
  location?: any;
  config?: DormitoryConfig;
}

export const addDormitory = async (data: Omit<DormitoryData, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'dormitories'), {
      name: data.name,
      address: data.address,
      totalFloors: data.totalFloors,
      floors: data.totalFloors,
      config: {
        roomTypes: {},
      },
      facilities: data.facilities || [],
      images: data.images || [],
      status: data.status || 'active',
      description: data.description,
      phone: data.phone,
      location: data.location,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding dormitory:', error);
    return { success: false, error };
  }
};

export const getDormitory = async (dormitoryId: string): Promise<{ success: boolean; data?: Dormitory; error?: string }> => {
  try {
    const dormitorySnap = await getDoc(doc(db, 'dormitories', dormitoryId));
    const billingSnap = await getDoc(doc(db, `dormitories/${dormitoryId}/settings/billing`));
    
    if (dormitorySnap.exists()) {
      const dormitory = {
        id: dormitorySnap.id,
        ...dormitorySnap.data(),
        billingConditions: billingSnap.exists() ? billingSnap.data() : {
          allowedDaysBeforeDueDate: 7,
          requireMeterReading: true,
          allowPartialBilling: false,
          minimumStayForBilling: 0,
          gracePeriod: 7,
          lateFeeRate: 2,
          autoGenerateBill: false
        }
      } as Dormitory;
      return { success: true, data: dormitory };
    }
    return { success: false, error: 'Dormitory not found' };
  } catch (error) {
    console.error('Error getting dormitory:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const updateDormitory = async (dormitoryId: string, data: Partial<Dormitory>): Promise<{ success: boolean; error?: string }> => {
  try {
    // Deep clean object to remove undefined values but keep null values
    const deepClean = (obj: any): any => {
      if (obj === null) return null;
      if (typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(deepClean);
      }
      
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, deepClean(value)])
      );
    };

    const cleanData = deepClean(data);

    // อัพเดทข้อมูลหลักของหอพัก
    const dormitoryRef = doc(db, 'dormitories', dormitoryId);
    
    // แปลง Date เป็น ISO string
    const processData = (obj: any): any => {
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) {
        return obj.map(processData);
      }
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, processData(value)])
      );
    };

    const processedData = processData(cleanData);
    
    // Log ข้อมูลที่จะบันทึก
    console.log('Saving dormitory data:', processedData);
    
    await updateDoc(dormitoryRef, {
      ...processedData,
      updatedAt: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating dormitory:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const deleteDormitory = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.DORMITORIES, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting dormitory:', error);
    return { success: false, error };
  }
};

export const queryDormitories = async (): Promise<{ success: boolean; data?: Dormitory[]; error?: string }> => {
  try {
    const dormitoriesRef = collection(db, 'dormitories');
    const dormitoriesSnap = await getDocs(dormitoriesRef);
    const dormitories = dormitoriesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Dormitory[];
    return { success: true, data: dormitories };
  } catch (error) {
    console.error('Error querying dormitories:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const getDormitoryStats = async (dormitoryId: string) => {
  try {
    // ดึงข้อมูลห้องทั้งหมดของหอพัก
    const roomsRef = collection(db, "rooms");
    const q = query(roomsRef, where("dormitoryId", "==", dormitoryId));
    const querySnapshot = await getDocs(q);

    // นับจำนวนห้องตามสถานะ
    let totalRooms = 0;
    let occupiedRooms = 0;
    let availableRooms = 0;
    let maintenanceRooms = 0;
    let totalRent = 0;

    querySnapshot.forEach((doc) => {
      const room = doc.data();
      totalRooms++;

      switch (room.status) {
        case "occupied":
          occupiedRooms++;
          break;
        case "available":
          availableRooms++;
          break;
        case "maintenance":
          maintenanceRooms++;
          break;
      }
    });

    // คำนวณอัตราการเข้าพัก
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    return {
      success: true,
      data: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        maintenanceRooms,
        occupancyRate,
        averageRent: 0, // จะคำนวณเมื่อมีข้อมูลค่าเช่า
        totalRevenue: 0, // จะคำนวณเมื่อมีข้อมูลรายได้
      },
    };
  } catch (error) {
    console.error("Error getting dormitory stats:", error);
    return {
      success: false,
      error: "เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ",
    };
  }
};

// Room functions
export const addRoom = async (dormitoryId: string, data: Omit<Room, "id">) => {
  try {
    // ตรวจสอบว่าเลขห้องไม่ซ้ำ
    const roomsRef = collection(db, `dormitories/${dormitoryId}/rooms`);
    const q = query(roomsRef, where('number', '==', data.number));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return { 
        success: false, 
        error: 'เลขห้องนี้มีอยู่แล้ว' 
      };
    }

    // สร้างห้องใหม่
    const docRef = await addDoc(roomsRef, {
      ...data,
      additionalServices: data.additionalServices || [], // เพิ่มค่าเริ่มต้นถ้าไม่มี
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { 
      success: true, 
      id: docRef.id,
      data: {
        id: docRef.id,
        ...data,
        additionalServices: data.additionalServices || [], // เพิ่มค่าเริ่มต้นถ้าไม่มี
      }
    };
  } catch (error) {
    console.error('Error adding room:', error);
    return { success: false, error };
  }
};

export const getRoom = async (dormitoryId: string, roomId: string) => {
  try {
    const docSnap = await getDoc(doc(db, `dormitories/${dormitoryId}/rooms`, roomId));
    if (docSnap.exists()) {
      return { 
        success: true, 
        data: { 
          id: docSnap.id, 
          ...docSnap.data() 
        } as Room 
      };
    } else {
      return { success: false, error: 'Room not found' };
    }
  } catch (error) {
    console.error('Error getting room:', error);
    return { success: false, error };
  }
};

interface UpdateRoomResult {
  success: boolean;
  data?: Room;
  error?: unknown;
}

export const updateRoom = async (dormitoryId: string, roomId: string, data: Partial<Room>): Promise<UpdateRoomResult> => {
  try {
    // ตรวจสอบว่า room ID มีอยู่จริง
    const roomRef = doc(db, `dormitories/${dormitoryId}/rooms`, roomId);
    const roomDoc = await getDoc(roomRef);
    
    if (!roomDoc.exists()) {
      return { 
        success: false, 
        error: 'ไม่พบข้อมูลห้องพัก' 
      };
    }

    const updatedData = {
      ...data,
      updatedAt: serverTimestamp()
    };

    await updateDoc(roomRef, updatedData);

    // ดึงข้อมูลล่าสุดหลังจากอัพเดท
    const updatedRoomDoc = await getDoc(roomRef);
    const updatedRoom = {
      id: updatedRoomDoc.id,
      ...updatedRoomDoc.data()
    } as Room;

    return { 
      success: true,
      data: updatedRoom
    };
  } catch (error) {
    console.error('Error updating room:', error);
    return { success: false, error };
  }
};

export const deleteRoom = async (dormitoryId: string, roomId: string) => {
  try {
    // ลบค่ามิเตอร์ทั้งหมดของห้องนี้
    const readingsRef = collection(db, `dormitories/${dormitoryId}/utility-readings`);
    const readingsQuery = query(readingsRef, where("roomId", "==", roomId));
    const readingsSnapshot = await getDocs(readingsQuery);
    
    const deletePromises = readingsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // ลบห้อง
    const roomRef = doc(db, `dormitories/${dormitoryId}/rooms/${roomId}`);
    await deleteDoc(roomRef);

    return { success: true };
  } catch (error) {
    console.error("Error deleting room:", error);
    return { success: false, error };
  }
};

export const getRooms = async (dormitoryId: string): Promise<{ success: boolean; data?: Room[] }> => {
  try {
    const roomsRef = collection(db, "dormitories", dormitoryId, "rooms");
    const roomsSnapshot = await getDocs(roomsRef);
    const rooms = roomsSnapshot.docs.map((doc) => ({
      id: doc.id,
      dormitoryId,
      ...doc.data()
    })) as Room[];
    return { success: true, data: rooms };
  } catch (error) {
    console.error("Error getting rooms:", error);
    return { success: false };
  }
};

// RoomType functions
export const addRoomType = async (dormitoryId: string, data: Omit<RoomType, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, `dormitories/${dormitoryId}/roomTypes`), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding room type:', error);
    return { success: false, error };
  }
};

export const getRoomTypes = async (dormitoryId: string) => {
  try {
    const docRef = doc(db, COLLECTIONS.DORMITORIES, dormitoryId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const roomTypes = data.config?.roomTypes || {};
      
      // แปลง object เป็น array และเพิ่ม id พร้อมกับระบุ type ให้ชัดเจน
      const roomTypesArray = Object.entries(roomTypes).map(([id, roomType]) => ({
        id,
        name: (roomType as RoomType).name,
        basePrice: (roomType as RoomType).basePrice,
        description: (roomType as RoomType).description,
        isDefault: (roomType as RoomType).isDefault,
        facilities: (roomType as RoomType).facilities || [],
      }));
      
      return { success: true, data: roomTypesArray };
    }
    
    return { success: false, error: 'ไม่พบข้อมูลรูปแบบห้อง' };
  } catch (error) {
    console.error('Error getting room types:', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรูปแบบห้อง' };
  }
};

export const updateRoomType = async (dormitoryId: string, id: string, data: Partial<RoomType>) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/roomTypes`, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating room type:', error);
    return { success: false, error };
  }
};

export const deleteRoomType = async (dormitoryId: string, id: string) => {
  try {
    await deleteDoc(doc(db, `dormitories/${dormitoryId}/roomTypes`, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting room type:', error);
    return { success: false, error };
  }
};

// Tenant functions
export const addTenant = async (data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, `dormitories/${data.dormitoryId}/tenants`), {
      ...data,
      outstandingBalance: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding tenant:', error);
    return { success: false, error };
  }
};

export const calculateOutstandingBalance = async (
  dormitoryId: string,
  tenantId: string
) => {
  try {
    // 1. ดึงข้อมูลบิลทั้งหมดของผู้เช่า
    const billsRef = collection(db, `dormitories/${dormitoryId}/bills`);
    const q = query(
      billsRef,
      where('tenantId', '==', tenantId),
      where('status', 'in', ['pending', 'partially_paid', 'overdue'])
    );
    
    const billsSnapshot = await getDocs(q);
    let totalOutstanding = 0;

    // 2. คำนวณยอดค้างชำระจากบิลที่ยังไม่ชำระหรือชำระบางส่วน
    billsSnapshot.forEach((doc) => {
      const bill = doc.data();
      totalOutstanding += bill.remainingAmount || bill.totalAmount;
    });

    // 3. อัพเดทยอดค้างชำระในข้อมูลผู้เช่า
    const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, tenantId);
    await updateDoc(tenantRef, {
      outstandingBalance: totalOutstanding,
      updatedAt: serverTimestamp()
    });

    return { success: true, outstandingBalance: totalOutstanding };
  } catch (error) {
    console.error('Error calculating outstanding balance:', error);
    return { success: false, error };
  }
};

export const updateAllTenantsOutstandingBalance = async (dormitoryId: string) => {
  try {
    const tenantsRef = collection(db, `dormitories/${dormitoryId}/tenants`);
    const tenantsSnapshot = await getDocs(tenantsRef);
    
    const updatePromises = tenantsSnapshot.docs.map(async (doc) => {
      const tenant = doc.data();
      return calculateOutstandingBalance(dormitoryId, doc.id);
    });

    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error updating all tenants outstanding balance:', error);
    return { success: false, error };
  }
};

export const queryTenants = async (dormitoryId: string): Promise<{ success: boolean; data?: Tenant[] }> => {
  try {
    const tenantsRef = collection(db, "dormitories", dormitoryId, "tenants");
    const tenantsSnapshot = await getDocs(tenantsRef);
    const tenants = tenantsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
    })) as Tenant[];
    return { success: true, data: tenants };
  } catch (error) {
    console.error("Error querying tenants:", error);
    return { success: false };
  }
};

export const updateTenant = async (dormitoryId: string, tenantId: string, data: Partial<Tenant>) => {
  try {
    // ดึงข้อมูลผู้เช่าเดิมก่อนอัพเดท
    const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, tenantId);
    const tenantSnap = await getDoc(tenantRef);
    
    if (!tenantSnap.exists()) {
      return { success: false, error: 'ไม่พบข้อมูลผู้เช่า' };
    }

    const currentTenantData = tenantSnap.data() as Tenant;
    
    // ถ้ามีการเปลี่ยนห้อง
    if (data.roomNumber && data.roomNumber !== currentTenantData.roomNumber) {
      // ตรวจสอบสถานะห้องใหม่
      const roomsRef = collection(db, `dormitories/${dormitoryId}/rooms`);
      const roomsSnapshot = await getDocs(roomsRef);
      const newRoom = roomsSnapshot.docs.find(doc => doc.data().number === data.roomNumber);
      const oldRoom = roomsSnapshot.docs.find(doc => doc.data().number === currentTenantData.roomNumber);

      if (!newRoom) {
        return { success: false, error: 'ไม่พบห้องใหม่ที่ระบุ' };
      }

      const newRoomData = newRoom.data();
      if (newRoomData.status === 'occupied') {
        return { success: false, error: 'ห้องใหม่มีผู้เช่าอยู่แล้ว' };
      }

      if (newRoomData.status === 'maintenance') {
        return { success: false, error: 'ห้องใหม่อยู่ระหว่างปรับปรุง' };
      }

      // เริ่ม transaction
      const batch = writeBatch(db);

      // อัพเดทข้อมูลผู้เช่า
      batch.update(tenantRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });

      // อัพเดทสถานะห้องเก่าเป็น available
      if (oldRoom) {
        batch.update(doc(db, `dormitories/${dormitoryId}/rooms`, oldRoom.id), {
          status: 'available',
          updatedAt: serverTimestamp(),
        });
      }

      // อัพเดทสถานะห้องใหม่เป็น occupied
      batch.update(doc(db, `dormitories/${dormitoryId}/rooms`, newRoom.id), {
        status: 'occupied',
        updatedAt: serverTimestamp(),
      });

      // ดำเนินการ transaction
      await batch.commit();
    } else {
      // ถ้าไม่มีการเปลี่ยนห้อง อัพเดทข้อมูลผู้เช่าอย่างเดียว
      await updateDoc(tenantRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating tenant:', error);
    return { success: false, error };
  }
};

export const deleteTenant = async (dormitoryId: string, tenantId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // ดึงข้อมูลผู้เช่า
    const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, tenantId);
    const tenantSnap = await getDoc(tenantRef);
    
    if (!tenantSnap.exists()) {
      return { success: false, error: 'ไม่พบข้อมูลผู้เช่า' };
    }

    const tenantData = tenantSnap.data() as Tenant;
    const batch = writeBatch(db);

    // ลบข้อมูลผู้เช่า
    batch.delete(tenantRef);

    // อัพเดทสถานะห้องโดยใช้ roomNumber
    if (tenantData.roomNumber) {
      // ค้นหาห้องจาก roomNumber
      const roomsRef = collection(db, `dormitories/${dormitoryId}/rooms`);
      const q = query(roomsRef, where('number', '==', tenantData.roomNumber));
      const roomsSnap = await getDocs(q);
      
      if (!roomsSnap.empty) {
        const roomDoc = roomsSnap.docs[0];
        batch.update(doc(db, `dormitories/${dormitoryId}/rooms`, roomDoc.id), {
          status: 'available',
          updatedAt: serverTimestamp()
        });
      }
    }

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูลผู้เช่า' };
  }
};

export const deleteMultipleTenants = async (dormitoryId: string, tenantIds: string[]) => {
  try {
    const batch = writeBatch(db);
    
    // ดึงข้อมูลผู้เช่าทั้งหมดที่จะลบ
    const tenantsData = await Promise.all(
      tenantIds.map(async (tenantId) => {
        const tenantSnap = await getDoc(doc(db, `dormitories/${dormitoryId}/tenants`, tenantId));
        const tenantData = tenantSnap.data() as Tenant;
        return { 
          ...tenantData,
          tenantId // ใช้ชื่อที่ไม่ซ้ำกับ id ใน Tenant interface
        };
      })
    );

    // ดึงข้อมูลห้องทั้งหมด
    const roomsRef = collection(db, `dormitories/${dormitoryId}/rooms`);
    const roomsSnapshot = await getDocs(roomsRef);
    const rooms = roomsSnapshot.docs;

    // ลบผู้เช่าและอัพเดทสถานะห้อง
    tenantsData.forEach((tenant) => {
      // ลบข้อมูลผู้เช่า
      const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, tenant.tenantId);
      batch.delete(tenantRef);

      // อัพเดทสถานะห้อง
      const room = rooms.find(r => r.data().number === tenant.roomNumber);
      if (room) {
        batch.update(doc(db, `dormitories/${dormitoryId}/rooms`, room.id), {
          status: 'available',
          updatedAt: serverTimestamp(),
        });
      }
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error deleting multiple tenants:', error);
    return { success: false, error };
  }
};

// Utility Reading Functions
export const addUtilityReading = async (dormitoryId: string, data: Omit<UtilityReading, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, `dormitories/${dormitoryId}/utilityReadings`), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding utility reading:', error);
    return { success: false, error };
  }
};

export const getUtilityReadings = async (dormitoryId: string, roomId?: string) => {
  try {
    let q = query(
      collection(db, `dormitories/${dormitoryId}/utilityReadings`),
      orderBy('readingDate', 'desc')
    );

    if (roomId) {
      q = query(q, where('roomId', '==', roomId));
    }

    const snapshot = await getDocs(q);
    const readings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UtilityReading[];

    return { success: true, data: readings };
  } catch (error) {
    console.error('Error getting utility readings:', error);
    return { success: false, error };
  }
};

export const deleteUtilityReading = async (dormitoryId: string, readingId: string) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/utility-readings/${readingId}`);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting utility reading:", error);
    return { success: false, error };
  }
};

export const deleteAllUtilityReadings = async (dormitoryId: string) => {
  try {
    const readingsRef = collection(db, `dormitories/${dormitoryId}/utility-readings`);
    const snapshot = await getDocs(readingsRef);
    
    // ลบทีละรายการ
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting all utility readings:", error);
    return { success: false, error };
  }
};

// Bill Functions
export const createBill = async (dormitoryId: string, data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const billRef = collection(db, `dormitories/${dormitoryId}/bills`);
    const docRef = await addDoc(billRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating bill:', error);
    return { success: false, error };
  }
};

export const getBills = async (dormitoryId: string, filters?: {
  roomId?: string;
  tenantId?: string;
  status?: Bill['status'];
  month?: number;
  year?: number;
}) => {
  try {
    let q = query(
      collection(db, `dormitories/${dormitoryId}/bills`),
      orderBy('createdAt', 'desc')
    );

    if (filters?.roomId) {
      q = query(q, where('roomId', '==', filters.roomId));
    }
    if (filters?.tenantId) {
      q = query(q, where('tenantId', '==', filters.tenantId));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.month && filters?.year) {
      q = query(q, 
        where('month', '==', filters.month),
        where('year', '==', filters.year)
      );
    }

    const snapshot = await getDocs(q);
    const bills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Bill[];

    return { success: true, data: bills };
  } catch (error) {
    console.error('Error getting bills:', error);
    return { success: false, error };
  }
};

export const updateBill = async (dormitoryId: string, billId: string, data: Partial<Bill>) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/bills`, billId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating bill:', error);
    return { success: false, error };
  }
};

export const updateBillStatus = async (
  dormitoryId: string,
  billId: string,
  data: {
    status: 'pending' | 'partially_paid' | 'paid';
    paidAmount: number;
    remainingAmount: number;
  }
) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/bills`, billId);
    await updateDoc(docRef, {
      status: data.status,
      paidAmount: data.paidAmount,
      remainingAmount: data.remainingAmount,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating bill status:', error);
    return { success: false, error };
  }
};

// Payment Functions
export const addPayment = async (dormitoryId: string, data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const paymentRef = collection(db, `dormitories/${dormitoryId}/payments`);
    const docRef = await addDoc(paymentRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding payment:', error);
    return { success: false, error };
  }
};

export const getPayments = async (dormitoryId: string, filters?: {
  billId?: string;
  tenantId?: string;
  method?: Payment['method'];
  startDate?: Date;
  endDate?: Date;
}) => {
  try {
    let q = query(
      collection(db, `dormitories/${dormitoryId}/payments`),
      orderBy('createdAt', 'desc')
    );

    if (filters?.billId) {
      q = query(q, where('billId', '==', filters.billId));
    }
    if (filters?.tenantId) {
      q = query(q, where('tenantId', '==', filters.tenantId));
    }
    if (filters?.method) {
      q = query(q, where('method', '==', filters.method));
    }
    if (filters?.startDate && filters?.endDate) {
      q = query(q,
        where('paidAt', '>=', filters.startDate),
        where('paidAt', '<=', filters.endDate)
      );
    }

    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Payment[];

    return { success: true, data: payments };
  } catch (error) {
    console.error('Error getting payments:', error);
    return { success: false, error };
  }
};

// PromptPay Config Functions
export const setPromptPayConfig = async (dormitoryId: string, data: Omit<PromptPayConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/settings/promptpay`);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error setting promptpay config:', error);
    return { success: false, error };
  }
};

export const getPromptPayConfig = async (dormitoryId: string) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/settings/promptpay`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } as PromptPayConfig };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error getting promptpay config:', error);
    return { success: false, error };
  }
};

// LINE Notify Config Functions
export const setLineNotifyConfig = async (dormitoryId: string, data: Omit<LineNotifyConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/settings/lineNotify`);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error setting line notify config:', error);
    return { success: false, error };
  }
};

export const getLineNotifyConfig = async (dormitoryId: string) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/settings/lineNotify`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } as LineNotifyConfig };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error getting line notify config:', error);
    return { success: false, error };
  }
};

export const recalculateOutstandingBalance = async (dormitoryId: string, tenantId: string) => {
  try {
    // ดึงข้อมูลบิลทั้งหมดของผู้เช่า
    const billsRef = collection(db, `dormitories/${dormitoryId}/bills`);
    const q = query(
      billsRef,
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const bills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Bill[];

    // คำนวณยอดคงค้างใหม่
    let outstandingBalance = 0;
    for (const bill of bills) {
      outstandingBalance += bill.remainingAmount;
    }

    // อัพเดทข้อมูลผู้เช่า
    const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, tenantId);
    await updateDoc(tenantRef, {
      outstandingBalance,
      updatedAt: serverTimestamp(),
    });

    return { success: true, outstandingBalance };
  } catch (error) {
    console.error('Error recalculating outstanding balance:', error);
    return { success: false, error };
  }
};

// ฟังก์ชันบันทึกค่ามิเตอร์
export const saveMeterReading = async (dormitoryId: string, data: {
  roomId: string;
  roomNumber: string;
  previousReading: number;
  currentReading: number;
  unitsUsed: number;
  readingDate: string;
  type: 'electric' | 'water';
}) => {
  try {
    const docRef = await addDoc(
      collection(db, `${COLLECTIONS.DORMITORIES}/${dormitoryId}/${COLLECTIONS.METER_READINGS}`), 
      {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    return { 
      success: true, 
      id: docRef.id,
      data: { ...data }
    };
  } catch (error) {
    console.error('Error saving meter reading:', error);
    return { success: false, error };
  }
};

// ฟังก์ชันดึงค่ามิเตอร์ล่าสุด
export const getLatestMeterReading = async (
  dormitoryId: string,
  roomNumber: string,
  type: 'electric' | 'water'
) => {
  try {
    const q = query(
      collection(db, `${COLLECTIONS.DORMITORIES}/${dormitoryId}/${COLLECTIONS.METER_READINGS}`),
      where('roomNumber', '==', roomNumber),
      where('type', '==', type),
      orderBy('readingDate', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return { 
        success: true, 
        data: {
          id: doc.id,
          ...data,
          unitsUsed: data.unitsUsed || data.currentReading - data.previousReading // ใช้ค่า unitsUsed ที่บันทึกไว้ หรือคำนวณใหม่ถ้าไม่มี
        }
      };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error getting latest meter reading:', error);
    return { success: false, error };
  }
};

export const getInitialMeterReading = async (dormitoryId: string): Promise<number> => {
  try {
    const dormRef = doc(db, 'dormitories', dormitoryId);
    const dormDoc = await getDoc(dormRef);
    
    if (dormDoc.exists()) {
      const dormData = dormDoc.data();
      return dormData.initialMeterReading || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting initial meter reading:', error);
    return 0;
  }
};

// เพิ่มฟังก์ชันสำหรับดึงประวัติการใช้ไฟฟ้า
export const getElectricityHistory = async (dormitoryId: string, roomNumber: string) => {
  try {
    const q = query(
      collection(db, `${COLLECTIONS.DORMITORIES}/${dormitoryId}/${COLLECTIONS.METER_READINGS}`),
      where('roomNumber', '==', roomNumber),
      where('type', '==', 'electric'),
      orderBy('readingDate', 'desc'),
      limit(12)
    );

    const snapshot = await getDocs(q);
    const readings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: readings };
  } catch (error) {
    if (error instanceof Error && error.message.includes('requires an index')) {
      console.error('Please create the required index in Firebase Console');
      return { 
        success: false, 
        error: 'กรุณาสร้าง index ใน Firebase Console ก่อนใช้งาน' 
      };
    }
    console.error('Error getting electricity history:', error);
    return { success: false, error };
  }
};

// บันทึกเงื่อนไขการออกบิล
export const saveBillingConditions = async (dormitoryId: string, conditions: any) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/settings/billing`);
    await setDoc(docRef, {
      ...conditions,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving billing conditions:', error);
    return { success: false, error };
  }
};

// ดึงเงื่อนไขการออกบิล
export const getBillingConditions = async (dormitoryId: string) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/settings/billing`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() as any };
    }
    
    // ถ้ายังไม่เคยตั้งค่า ใช้ค่าเริ่มต้น
    const defaultConditions: any = {
      allowedDaysBeforeDueDate: 7,
      requireMeterReading: true,
      allowPartialBilling: false,
      minimumStayForBilling: 0,
      gracePeriod: 7,
      lateFeeRate: 2,
      autoGenerateBill: false
    };
    
    return { success: true, data: defaultConditions };
  } catch (error) {
    console.error('Error getting billing conditions:', error);
    return { success: false, error };
  }
};

// เพิ่มฟังก์ชันสำหรับสร้าง default config
export async function initializeDormitoryConfig() {
  const configRef = doc(db, 'config', 'dormitory');
  const configSnap = await getDoc(configRef);

  if (!configSnap.exists()) {
    const defaultConfig = {
      roomTypes: {},
      additionalFees: {
        utilities: {
          water: {
            perPerson: null,
          },
          electric: {
            unit: null,
          },
        },
        items: [],
        floorRates: {},
      },
      billingConditions: {
        allowedDaysBeforeDueDate: 0,
        requireMeterReading: false,
        waterBillingType: "perPerson",
        electricBillingType: "perUnit",
        allowPartialBilling: false,
        minimumStayForBilling: 0,
        gracePeriod: 0,
        lateFeeRate: 0,
        autoGenerateBill: false,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    } as DormitoryConfig;
    
    await setDoc(configRef, defaultConfig);
    return defaultConfig;
  }

  return configSnap.data() as DormitoryConfig;
}

// ปรับปรุงฟังก์ชัน getDormitoryConfig
export async function getDormitoryConfig() {
  const configRef = doc(db, 'config', 'dormitory');
  const configSnap = await getDoc(configRef);
  
  if (!configSnap.exists()) {
    // ถ้าไม่มีข้อมูล config ให้สร้าง default
    return initializeDormitoryConfig();
  }

  return configSnap.data() as {
    roomRate: number;
    waterRate: number;
    electricityRate: number;
    commonFee: number;
    additionalServices: Array<{
      name: string;
      price: number;
    }>;
  };
}

export async function getActiveTenants() {
  try {
    console.log("เริ่มดึงข้อมูลผู้เช่า...");

    // ดึงข้อมูลจากคอลเลคชั่น rooms
    const roomsRef = collection(db, 'rooms');
    const roomsSnapshot = await getDocs(roomsRef);
    
    console.log("จำนวนห้องทั้งหมด:", roomsSnapshot.size);

    // แสดงข้อมูลแต่ละห้อง
    roomsSnapshot.docs.forEach(doc => {
      console.log("ข้อมูลห้อง:", {
        roomId: doc.id,
        data: doc.data()
      });
    });

    // กรองเฉพาะห้องที่มีผู้เช่า
    const activeRooms = roomsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        tenantId: doc.data().tenantId,
        status: doc.data().status
      }))
      .filter(room => room.tenantId && room.status === 'active');

    console.log("ห้องที่มีผู้เช่าและสถานะ active:", activeRooms);

    return activeRooms as any[];
  } catch (error) {
    console.error("Error getting active tenants:", error);
    throw error;
  }
}

export async function getTenant(dormitoryId: string, tenantId: string) {
  try {
    const docRef = doc(db, "dormitories", dormitoryId, "tenants", tenantId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        success: true,
        data: {
          id: docSnap.id,
          ...docSnap.data()
        }
      };
    }

    return {
      success: false,
      error: "Tenant not found"
    };
  } catch (error) {
    console.error("Error getting tenant:", error);
    return {
      success: false,
      error: "Failed to get tenant"
    };
  }
}

// ฟังก์ชันสำหรับย้ายข้อมูลผู้เช่าไปยังประวัติ
export const moveTenantToHistory = async (
  dormitoryId: string,
  tenantId: string,
  leaveReason: 'incorrect_data' | 'end_contract',
  note?: string
) => {
  try {
    if (!dormitoryId || !tenantId) {
      return { success: false, error: 'ไม่ได้ระบุข้อมูลที่จำเป็น' };
    }

    // 1. ดึงข้อมูลผู้เช่า
    const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, tenantId);
    const tenantSnap = await getDoc(tenantRef);
    
    if (!tenantSnap.exists()) {
      return { success: false, error: 'ไม่พบข้อมูลผู้เช่า' };
    }

    const tenantData = tenantSnap.data() as Tenant;
    
    // 2. สร้างประวัติผู้เช่า
    const historyRef = collection(db, `dormitories/${dormitoryId}/tenant-history`);
    const historyData = {
      ...tenantData,
      tenantId: tenantId,
      leaveDate: new Date().toISOString(),
      leaveReason,
      note,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const batch = writeBatch(db);

    // เพิ่มประวัติผู้เช่า
    const newHistoryRef = doc(historyRef);
    batch.set(newHistoryRef, historyData);

    // ตรวจสอบและอัพเดทสถานะห้อง (ถ้ามี)
    if (tenantData.roomNumber) {
      // ค้นหาห้องจาก roomNumber
      const roomsRef = collection(db, `dormitories/${dormitoryId}/rooms`);
      const q = query(roomsRef, where('number', '==', tenantData.roomNumber));
      const roomsSnap = await getDocs(q);
      
      if (!roomsSnap.empty) {
        const roomDoc = roomsSnap.docs[0];
        batch.update(doc(db, `dormitories/${dormitoryId}/rooms`, roomDoc.id), {
          status: 'available',
          updatedAt: serverTimestamp()
        });
      }
    }

    // ลบข้อมูลผู้เช่า
    batch.delete(tenantRef);

    // ดำเนินการทั้งหมดพร้อมกัน
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error moving tenant to history:', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการย้ายข้อมูลผู้เช่าไปยังประวัติ' };
  }
};

// ฟังก์ชันดึงประวัติผู้เช่า
export const getTenantHistory = async (dormitoryId: string) => {
  try {
    if (!dormitoryId) {
      return { success: false, error: 'ไม่ได้ระบุรหัสหอพัก' };
    }

    const historyRef = collection(db, `dormitories/${dormitoryId}/tenant-history`);
    const q = query(historyRef, orderBy('leaveDate', 'desc'));
    const snapshot = await getDocs(q);

    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log("getTenantHistory data:", history);

    // Fetch dormitory names
    const historyWithDormNames = await Promise.all(history.map(async (record:any) => {
      if (!record.dormitoryId) {
        return record; // Skip if no dormitoryId
      }
      const dormitory = await getDormitory(record.dormitoryId);
      return {
        ...record,
        dormitoryName: dormitory.success && dormitory.data ? dormitory.data.name : 'Unknown',
      };
    }));

    return { success: true, data: historyWithDormNames };
  } catch (error) {
    console.error('Error getting tenant history:', error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติผู้เช่า' };
  }
};
