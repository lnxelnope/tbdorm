import { db, storage } from './firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  MaintenanceRequest,
  MaintenanceStats,
  MaintenanceNote,
  MaintenanceRequestResponse,
  MaintenanceStatsResponse,
  MaintenanceNoteResponse,
} from '@/types/maintenance';

const MAINTENANCE_COLLECTION = 'maintenance_requests';
const NOTES_COLLECTION = 'maintenance_notes';

// สร้างคำขอแจ้งซ่อมใหม่
export async function createMaintenanceRequest(
  data: Omit<MaintenanceRequest, 'id'>
): Promise<MaintenanceRequestResponse> {
  try {
    const docRef = await addDoc(collection(db, MAINTENANCE_COLLECTION), {
      ...data,
      createdAt: Timestamp.fromDate(new Date(data.createdAt)),
    });

    return {
      success: true,
      data: { id: docRef.id, ...data },
    };
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างคำขอแจ้งซ่อม',
    };
  }
}

// อัพโหลดรูปภาพ
export async function uploadMaintenanceImage(file: File): Promise<string | null> {
  try {
    const storageRef = ref(storage, `maintenance/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}

// ดึงคำขอแจ้งซ่อมทั้งหมด
export async function getMaintenanceRequests(
  dormitoryId: string,
  filters?: Partial<Pick<MaintenanceRequest, 'status' | 'priority'>>
): Promise<MaintenanceRequestResponse> {
  try {
    let q = collection(db, MAINTENANCE_COLLECTION);
    const conditions = [];

    if (filters?.status) {
      conditions.push(where('status', '==', filters.status));
    }
    if (filters?.priority) {
      conditions.push(where('priority', '==', filters.priority));
    }

    conditions.push(orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(
      query(q, ...conditions)
    );

    const requests: MaintenanceRequest[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
        completedAt: data.completedAt?.toDate().toISOString(),
      } as MaintenanceRequest);
    });

    return {
      success: true,
      data: requests,
    };
  } catch (error) {
    console.error('Error getting maintenance requests:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอแจ้งซ่อม',
    };
  }
}

// อัพเดทสถานะคำขอแจ้งซ่อม
export async function updateMaintenanceStatus(
  requestId: string,
  newStatus: MaintenanceRequest['status']
): Promise<MaintenanceRequestResponse> {
  try {
    const docRef = doc(db, MAINTENANCE_COLLECTION, requestId);
    const updateData: any = {
      status: newStatus,
      updatedAt: Timestamp.now(),
    };

    if (newStatus === 'completed') {
      updateData.completedAt = Timestamp.now();
    }

    await updateDoc(docRef, updateData);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error updating maintenance status:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการอัพเดทสถานะ',
    };
  }
}

// เพิ่มบันทึกให้กับคำขอแจ้งซ่อม
export async function addMaintenanceNote(
  note: Omit<MaintenanceNote, 'id'>
): Promise<MaintenanceNoteResponse> {
  try {
    const docRef = await addDoc(collection(db, NOTES_COLLECTION), {
      ...note,
      createdAt: Timestamp.fromDate(new Date(note.createdAt)),
    });

    return {
      success: true,
      data: { id: docRef.id, ...note },
    };
  } catch (error) {
    console.error('Error adding maintenance note:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการเพิ่มบันทึก',
    };
  }
}

// ดึงบันทึกทั้งหมดของคำขอแจ้งซ่อม
export async function getMaintenanceNotes(
  requestId: string
): Promise<MaintenanceNoteResponse> {
  try {
    const q = query(
      collection(db, NOTES_COLLECTION),
      where('requestId', '==', requestId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const notes: MaintenanceNote[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notes.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate().toISOString(),
      } as MaintenanceNote);
    });

    return {
      success: true,
      data: notes,
    };
  } catch (error) {
    console.error('Error getting maintenance notes:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบันทึก',
    };
  }
}

// ดึงสถิติการแจ้งซ่อม
export async function getMaintenanceStats(
  dormitoryId: string
): Promise<MaintenanceStatsResponse> {
  try {
    const q = collection(db, MAINTENANCE_COLLECTION);
    const querySnapshot = await getDocs(q);

    const stats: MaintenanceStats = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      stats.total++;

      switch (data.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'completed':
          stats.completed++;
          if (data.completedAt && data.createdAt) {
            const completionTime =
              data.completedAt.toDate().getTime() -
              data.createdAt.toDate().getTime();
            totalCompletionTime += completionTime;
            completedCount++;
          }
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }
    });

    if (completedCount > 0) {
      // คำนวณเวลาเฉลี่ยในการซ่อมเป็นวัน
      stats.averageCompletionTime =
        totalCompletionTime / (completedCount * 24 * 60 * 60 * 1000);
    }

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error('Error getting maintenance stats:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ',
    };
  }
} 