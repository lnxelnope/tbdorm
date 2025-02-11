// ประเภทของผู้ใช้งานระบบ
export type UserRole = 'admin' | 'staff' | 'tenant';

// interface สำหรับผู้ใช้งานระบบ
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber: string;
  lineId?: string;
  dormitoryId?: string; // สำหรับ staff ที่ดูแลหอพักเฉพาะ
  createdAt: Date;
  updatedAt: Date;
}

// interface สำหรับหอพัก
export interface Dormitory {
  id: string;
  name: string;
  address: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  totalRooms: number;
  monthlyRent: number;
  waterRate: number;
  electricityRate: number;
  description?: string;
  images?: string[];
  createdAt: any;
  updatedAt: any;
}

// interface สำหรับห้องพัก
export interface Room {
  id: string;
  dormitoryId: string;
  number: string;
  floor: number;
  type: 'standard' | 'deluxe' | 'suite';
  basePrice: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  features: {
    hasAC: boolean;
    isGroundFloor: boolean;
    [key: string]: boolean; // สำหรับฟีเจอร์เพิ่มเติมในอนาคต
  };
  featuresPricing: {
    groundFloorPrice: number;
    [key: string]: number;
  };
  currentTenantIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// interface สำหรับผู้เช่า
// export interface Tenant {
//   id: string;
//   userId: string; // เชื่อมกับ User
//   roomId: string;
//   dormitoryId: string;
//   startDate: Date;
//   endDate?: Date;
//   deposit: number;
//   numberOfResidents: number;
//   emergencyContact: {
//     name: string;
//     relationship: string;
//     phone: string;
//   };
//   status: 'active' | 'inactive';
//   createdAt: Date;
//   updatedAt: Date;
// }

// interface สำหรับการอ่านมิเตอร์
export interface UtilityReading {
  id: string;
  dormitoryId: string;
  roomId: string;
  type: 'electricity' | 'water';
  previousReading: number;
  currentReading: number;
  unitsUsed: number;
  readingDate: Date;
  readByUserId: string;
  photo?: string; // URL รูปถ่ายมิเตอร์
  createdAt: Date;
}

// interface สำหรับบิล
export interface Bill {
  id: string;
  dormitoryId: string;
  roomId: string;
  tenantId: string;
  month: number;
  year: number;
  dueDate: Date;
  items: {
    rent: number;
    electricity: number;
    water: number;
    maintenance?: number;
    lateFee?: number;
    [key: string]: number | undefined;
  };
  totalAmount: number;
  status: 'pending' | 'paid' | 'overdue';
  paymentMethod?: 'cash' | 'transfer' | 'promptpay';
  paymentDate?: Date;
  paymentProof?: string; // URL สลิปการโอนเงิน
  createdAt: Date;
  updatedAt: Date;
}

// interface สำหรับการแจ้งซ่อม
export interface MaintenanceRequest {
  id: string;
  dormitoryId: string;
  roomId: string;
  tenantId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  photos: string[]; // URLs รูปภาพ
  assignedToUserId?: string;
  completedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// interface สำหรับการแจ้งเตือน
export interface Notification {
  id: string;
  userId: string;
  type: 'bill' | 'maintenance' | 'payment' | 'utility_reading' | 'system';
  title: string;
  message: string;
  read: boolean;
  data?: any; // ข้อมูลเพิ่มเติมที่เกี่ยวข้อง
  createdAt: Date;
}

// interface สำหรับการตรวจจับทุจริต
export interface FraudAlert {
  id: string;
  dormitoryId: string;
  roomId: string;
  type: 'water' | 'electricity';
  readingId: string;
  description: string;
  status: 'pending' | 'investigating' | 'confirmed' | 'false_alarm';
  investigatedBy?: string;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomType {
  id: string;
  name: string;
  basePrice: number;
  isDefault: boolean;
  description?: string;
  facilities?: string[];
  size?: string;
} 