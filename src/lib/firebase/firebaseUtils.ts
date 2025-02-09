import { auth, db } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
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
import type { Dormitory, Room, RoomType, Tenant, UtilityReading, Bill, Payment, PromptPayConfig, LineNotifyConfig } from '@/types/dormitory';

// Collection names
export const COLLECTIONS = {
  DORMITORIES: 'dormitories',
  ROOMS: 'rooms',
  TENANTS: 'tenants',
};

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Dormitory functions
export const addDormitory = async (data: Omit<Dormitory, 'id' | 'createdAt' | 'updatedAt'>) => {
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

export const getDormitory = async (id: string) => {
  try {
    console.log('Fetching dormitory with ID:', id);
    const docSnap = await getDoc(doc(db, COLLECTIONS.DORMITORIES, id));
    console.log('Document snapshot exists:', docSnap.exists());
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Raw dormitory data:', data);
      return { 
        success: true, 
        data: { 
          id: docSnap.id,
          name: data.name || '',
          address: data.address || '',
          totalFloors: data.totalFloors || 1,
          floors: data.floors || data.totalFloors || 1,
          config: {
            roomTypes: data.config?.roomTypes || {},
            additionalFees: {
              airConditioner: data.config?.additionalFees?.airConditioner ?? null,
              parking: data.config?.additionalFees?.parking ?? null,
              floorRates: data.config?.additionalFees?.floorRates || {
                "1": null,
                "2": null
              },
              utilities: {
                water: {
                  perPerson: data.config?.additionalFees?.utilities?.water?.perPerson ?? null
                },
                electric: {
                  unit: data.config?.additionalFees?.utilities?.electric?.unit ?? null
                }
              }
            }
          },
          facilities: data.facilities || [],
          images: data.images || [],
          status: data.status || 'active',
          description: data.description || '',
          phone: data.phone || '',
          location: data.location || null,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
        } as Dormitory 
      };
    } else {
      console.log('Document not found');
      return { success: false, error: 'Document not found' };
    }
  } catch (error) {
    console.error('Error getting dormitory:', error);
    return { success: false, error };
  }
};

export const updateDormitory = async (id: string, data: Partial<Dormitory>) => {
  try {
    const docRef = doc(db, COLLECTIONS.DORMITORIES, id);
    const updateData = {
      ...data,
      totalFloors: data.totalFloors || 1,
      floors: data.totalFloors || 1,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(docRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating dormitory:', error);
    return { success: false, error };
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

export const queryDormitories = async (options?: {
  orderBy?: 'name' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}) => {
  try {
    const constraints: QueryConstraint[] = [];

    if (options?.orderBy) {
      constraints.push(orderBy(options.orderBy, options.orderDirection || 'asc'));
    }

    const q = constraints.length > 0
      ? query(collection(db, COLLECTIONS.DORMITORIES), ...constraints)
      : collection(db, COLLECTIONS.DORMITORIES);

    const querySnapshot = await getDocs(q);

    const dormitoriesPromises = querySnapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      
      // ดึงข้อมูลจำนวนห้องพักแบบ batch
      const roomsRef = collection(db, `dormitories/${docSnapshot.id}/rooms`);
      const roomsSnapshot = await getDocs(roomsRef);
      const totalRooms = roomsSnapshot.size;

      return {
        id: docSnapshot.id,
        name: data.name || '',
        address: data.address || '',
        totalFloors: data.totalFloors || 1,
        floors: data.floors || data.totalFloors || 1,
        config: {
          roomTypes: data.config?.roomTypes || {},
          additionalFees: {
            airConditioner: data.config?.additionalFees?.airConditioner ?? null,
            parking: data.config?.additionalFees?.parking ?? null,
            floorRates: data.config?.additionalFees?.floorRates || {
              "1": null,
              "2": null
            },
            utilities: {
              water: {
                perPerson: data.config?.additionalFees?.utilities?.water?.perPerson ?? null
              },
              electric: {
                unit: data.config?.additionalFees?.utilities?.electric?.unit ?? null
              }
            }
          }
        },
        facilities: data.facilities || [],
        images: data.images || [],
        status: data.status || 'active',
        description: data.description || '',
        phone: data.phone || '',
        location: data.location || null,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
        totalRooms
      } as Dormitory;
    });

    const dormitories = await Promise.all(dormitoriesPromises);
    return { success: true, data: dormitories };
  } catch (error) {
    console.error('Error querying dormitories:', error);
    return { success: false, error: 'Failed to query dormitories' };
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
export const addRoom = async (dormitoryId: string, data: Omit<Room, 'id'>) => {
  try {
    const roomsRef = collection(db, `dormitories/${dormitoryId}/rooms`);
    const roomDoc = await addDoc(roomsRef, {
      ...data,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    });

    // เพิ่มค่ามิเตอร์เริ่มต้น
    const readingsRef = collection(db, `dormitories/${dormitoryId}/utility-readings`);
    await addDoc(readingsRef, {
      roomId: roomDoc.id,
      dormitoryId,
      type: "electric",
      previousReading: data.initialMeterReading || 0,
      currentReading: data.initialMeterReading || 0,
      readingDate: Timestamp.fromDate(new Date()),
      units: 0,
      createdAt: Timestamp.fromDate(new Date()),
      createdBy: "admin"
    });

    return {
      success: true,
      id: roomDoc.id,
    };
  } catch (error) {
    console.error("Error adding room:", error);
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

export const updateRoom = async (dormitoryId: string, roomId: string, data: Partial<Room>) => {
  try {
    const docRef = doc(db, `dormitories/${dormitoryId}/rooms`, roomId);
    await updateDoc(docRef, data);
    return { success: true };
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

export const getRooms = async (dormitoryId: string) => {
  try {
    // ดึงข้อมูลห้องทั้งหมด
    const roomsRef = collection(db, `dormitories/${dormitoryId}/rooms`);
    const roomsSnapshot = await getDocs(roomsRef);
    const rooms = roomsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Room[];

    // ดึงข้อมูลผู้เช่าทั้งหมด
    const tenantsRef = collection(db, `dormitories/${dormitoryId}/tenants`);
    const tenantsSnapshot = await getDocs(tenantsRef);
    const tenants = tenantsSnapshot.docs.map(doc => {
      const tenantData = doc.data();
      return {
        tenantId: doc.id,
        roomNumber: tenantData.roomNumber,
      };
    });

    // อัพเดทสถานะห้องตามข้อมูลผู้เช่า
    const batch = writeBatch(db);
    let hasUpdates = false;

    rooms.forEach((room) => {
      const hasTenant = tenants.some(tenant => tenant.roomNumber === room.number);
      const shouldBeOccupied = hasTenant && room.status !== 'occupied';
      const shouldBeAvailable = !hasTenant && room.status === 'occupied';

      if (shouldBeOccupied || shouldBeAvailable) {
        hasUpdates = true;
        const roomRef = doc(db, `dormitories/${dormitoryId}/rooms`, room.id);
        batch.update(roomRef, {
          status: hasTenant ? 'occupied' : 'available',
          updatedAt: serverTimestamp(),
        });
        // อัพเดทสถานะในข้อมูลที่จะส่งกลับด้วย
        room.status = hasTenant ? 'occupied' : 'available';
      }
    });

    // ถ้ามีการอัพเดท ให้ commit batch
    if (hasUpdates) {
      await batch.commit();
    }

    return { success: true, data: rooms };
  } catch (error) {
    console.error("Error getting rooms:", error);
    return { success: false, error: "Failed to get rooms" };
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
      const roomTypes = data.config?.roomTypes as Record<string, Omit<RoomType, 'id'>> || {};
      
      // แปลง object เป็น array และเพิ่ม id
      const roomTypesArray = Object.entries(roomTypes).map(([id, type]) => ({
        ...type,
        id,
      }));
      
      return { success: true, data: roomTypesArray };
    }
    
    return { success: false, error: 'Document not found' };
  } catch (error) {
    console.error('Error getting room types:', error);
    return { success: false, error };
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

export const queryTenants = async (dormitoryId?: string) => {
  try {
    let tenantsQuery;
    
    if (dormitoryId) {
      // ถ้าระบุ dormitoryId ให้ดึงเฉพาะผู้เช่าในหอพักนั้น
      tenantsQuery = collection(db, `dormitories/${dormitoryId}/tenants`);
    } else {
      // ถ้าไม่ระบุ dormitoryId ให้ดึงผู้เช่าทั้งหมด
      tenantsQuery = collectionGroup(db, 'tenants');
    }
    
    const snapshot = await getDocs(tenantsQuery);
    const tenants = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
      } as Tenant;
    });

    // ดึงข้อมูลบิลและคำนวณยอดคงค้างสำหรับแต่ละผู้เช่า
    if (dormitoryId) {
      const billsRef = collection(db, `dormitories/${dormitoryId}/bills`);
      for (const tenant of tenants) {
        const q = query(
          billsRef,
          where('tenantId', '==', tenant.id),
          where('status', 'in', ['pending', 'partially_paid'])
        );
        const billsSnapshot = await getDocs(q);
        const bills = billsSnapshot.docs.map(doc => doc.data() as Bill);
        
        // คำนวณยอดคงค้างจากบิลที่ยังไม่ชำระหรือชำระบางส่วน
        const outstandingBalance = bills.reduce((total, bill) => total + bill.remainingAmount, 0);
        
        // อัพเดทยอดคงค้างในข้อมูลผู้เช่า
        tenant.outstandingBalance = outstandingBalance;
        
        // อัพเดทในฐานข้อมูลด้วย
        const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, tenant.id);
        await updateDoc(tenantRef, {
          outstandingBalance,
          updatedAt: serverTimestamp(),
        });
      }
    }
    
    return { success: true, data: tenants };
  } catch (error) {
    console.error('Error querying tenants:', error);
    return { success: false, error };
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

export const deleteTenant = async (dormitoryId: string, tenantId: string) => {
  try {
    // ดึงข้อมูลผู้เช่าก่อนลบ
    const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, tenantId);
    const tenantSnap = await getDoc(tenantRef);
    
    if (!tenantSnap.exists()) {
      return { success: false, error: 'ไม่พบข้อมูลผู้เช่า' };
    }

    const tenantData = tenantSnap.data();
    
    // เริ่มการทำ transaction
    const batch = writeBatch(db);

    // ลบข้อมูลผู้เช่า
    batch.delete(tenantRef);

    // อัพเดทสถานะห้องเป็น available
    const roomsRef = collection(db, `dormitories/${dormitoryId}/rooms`);
    const roomsSnapshot = await getDocs(roomsRef);
    const room = roomsSnapshot.docs.find(doc => doc.data().number === tenantData.roomNumber);

    if (room) {
      batch.update(doc(db, `dormitories/${dormitoryId}/rooms`, room.id), {
        status: 'available',
        updatedAt: serverTimestamp(),
      });
    }

    // ดำเนินการ transaction
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return { success: false, error };
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

    // อัพเดทค่าเช่าคงค้างของผู้เช่า
    const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, data.tenantId);
    const tenantDoc = await getDoc(tenantRef);
    if (tenantDoc.exists()) {
      const tenant = tenantDoc.data();
      await updateDoc(tenantRef, {
        outstandingBalance: (tenant.outstandingBalance || 0) + data.totalAmount,
        updatedAt: serverTimestamp(),
      });
    }

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
    // เพิ่มการชำระเงิน
    const paymentRef = collection(db, `dormitories/${dormitoryId}/payments`);
    const docRef = await addDoc(paymentRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // อัพเดทสถานะบิล
    const billRef = doc(db, `dormitories/${dormitoryId}/bills`, data.billId);
    const billDoc = await getDoc(billRef);
    if (billDoc.exists()) {
      const bill = billDoc.data() as Bill;
      const newPaidAmount = (bill.paidAmount || 0) + data.amount;
      const newRemainingAmount = bill.totalAmount - newPaidAmount;
      const newStatus = newRemainingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partially_paid' : 'pending';

      await updateDoc(billRef, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        payments: arrayUnion({
          id: docRef.id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        updatedAt: serverTimestamp(),
      });

      // อัพเดทค่าเช่าคงค้างของผู้เช่า
      const tenantRef = doc(db, `dormitories/${dormitoryId}/tenants`, data.tenantId);
      const tenantDoc = await getDoc(tenantRef);
      if (tenantDoc.exists()) {
        const tenant = tenantDoc.data();
        await updateDoc(tenantRef, {
          outstandingBalance: Math.max(0, (tenant.outstandingBalance || 0) - data.amount),
          updatedAt: serverTimestamp(),
        });
      }
    }

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

// ฟังก์ชันสำหรับบันทึกค่ามิเตอร์
export const saveMeterReading = async (dormitoryId: string, data: {
  roomId: string;
  previousReading: number;
  currentReading: number;
  readingDate: string;
  type: 'electric' | 'water';
}) => {
  try {
    const meterReadingRef = collection(db, 'dormitories', dormitoryId, 'meter_readings');
    const docRef = await addDoc(meterReadingRef, {
      ...data,
      unitsUsed: data.currentReading - data.previousReading,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      data: {
        id: docRef.id,
        ...data
      }
    };
  } catch (error) {
    console.error('Error saving meter reading:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกค่ามิเตอร์'
    };
  }
};

// ฟังก์ชันสำหรับดึงประวัติค่ามิเตอร์
export const getMeterReadingHistory = async (dormitoryId: string, roomId: string, type: 'electric' | 'water') => {
  try {
    const meterReadingRef = collection(db, 'dormitories', dormitoryId, 'meter_readings');
    const q = query(
      meterReadingRef,
      where('roomId', '==', roomId),
      where('type', '==', type),
      orderBy('readingDate', 'desc'),
      limit(12) // ดึงข้อมูลย้อนหลัง 12 เดือน
    );

    const snapshot = await getDocs(q);
    const readings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      data: readings
    };
  } catch (error) {
    console.error('Error getting meter reading history:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงประวัติค่ามิเตอร์'
    };
  }
};

// ฟังก์ชันสำหรับดึงค่ามิเตอร์ล่าสุด
export const getLatestMeterReading = async (dormitoryId: string, roomId: string, type: 'electric' | 'water') => {
  try {
    const readingsRef = collection(db, 'meter_readings');
    const q = query(
      readingsRef,
      where('roomId', '==', roomId),
      where('type', '==', type),
      orderBy('readingDate', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: true, data: null };
    }

    const latestReading = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };

    return { success: true, data: latestReading };
  } catch (error) {
    console.error('Error getting latest meter reading:', error);
    return { success: false, error };
  }
};
