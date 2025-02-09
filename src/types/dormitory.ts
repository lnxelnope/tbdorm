export interface RoomType {
  id: string;
  name: string; // ชื่อรูปแบบห้อง เช่น มาตรฐาน, ห้องมุม
  basePrice: number;
  isDefault: boolean; // เป็นรูปแบบ default หรือไม่
  description?: string; // คำอธิบายเพิ่มเติม (ถ้ามี)
  facilities?: string[];
  size?: {
    width: number;
    length: number;
  };
  airConditionerFee: number;
  parkingFee: number;
}

export interface DormitoryConfig {
  id: string;
  dormitoryId: string;
  roomTypes: {
    [key: string]: RoomType;
  };
  additionalFees: {
    airConditioner: number | null; // ค่าบริการแอร์
    parking: number | null; // ค่าที่จอดรถส่วนตัว
    floorRates: Record<string, number>;
    utilities: {
      water: {
        perPerson: number | null;
      };
      electric: {
        unit: number | null;
      };
    };
  };
}

export interface Room {
  id: string;
  dormitoryId: string;
  number: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance';
  roomType: string;
  rent?: number;
  hasAirConditioner: boolean;
  hasParking: boolean;
  initialMeterReading?: number; // เพิ่มฟิลด์ค่ามิเตอร์เริ่มต้น
  tenantName?: string; // เพิ่ม tenantName
  createdAt?: Date;
  updatedAt?: Date;
}

// คำนวณค่าเช่าทั้งหมด
export const calculateTotalRent = (
  room: Room,
  roomType: RoomType,
  config: DormitoryConfig
): number => {
  let total = roomType.basePrice || 0;

  // บวกค่าแอร์ (ถ้ามี)
  if (room.hasAirConditioner) {
    total += config.additionalFees.airConditioner || 0;
  }

  // บวกค่าที่จอดรถ (ถ้ามี)
  if (room.hasParking) {
    total += config.additionalFees.parking || 0;
  }

  // บวก/ลบค่าชั้น
  const floorRate = config.additionalFees.floorRates[room.floor.toString()] || 0;
  total += floorRate;

  return total;
};

export interface Dormitory {
  id: string;
  name: string;
  address?: string;
  totalFloors?: number;
  floors?: number[];
  facilities?: string[];
  status?: string;
  config?: {
    roomTypes?: {
      [key: string]: RoomType;
    };
    additionalFees?: {
      airConditioner: number | null;
      parking: number | null;
      floorRates: Record<string, number>;
      utilities: {
        water: {
          perPerson: number | null;
        };
        electric: {
          unit: number | null;
        };
      };
    };
  };
  images: string[];
  description?: string;
  phone?: string;
  location?: {
    latitude: string;
    longitude: string;
  };
  createdAt: string;
  updatedAt: string;
  totalRooms?: number;
  rooms?: Room[];
}

export interface DormitoryStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  occupancyRate: number;
  averageRent: number;
  totalRevenue: number;
}

export interface Tenant {
  id: string;
  tenantId: string;
  name: string;
  roomNumber: string;
  roomId: string;
  dormitoryId: string;
  phone: string;
  email: string;
  moveInDate: string;
  status: 'active' | 'inactive' | 'moving_out';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UtilityReading {
  id: string;
  roomId: string;
  dormitoryId: string;
  type: 'water' | 'electric';
  previousReading: number;
  currentReading: number;
  readingDate: Date;
  units: number; // หน่วยที่ใช้ (currentReading - previousReading)
  createdAt: Date;
  createdBy: string;
  isBilled: boolean;
  billId?: string;
}

export interface Bill {
  id: string;
  dormitoryId: string;
  roomId: string;
  tenantId: string;
  month: number;
  year: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  items: BillItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: Date;
  updatedAt: Date;
  payments: Payment[];
  notificationsSent: {
    initial: boolean;
    reminder: boolean;
    overdue: boolean;
  };
}

export interface BillItem {
  type: 'rent' | 'water' | 'electric' | 'parking' | 'air_conditioner' | 'other';
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  utilityReading?: {
    previous: number;
    current: number;
    units: number;
  };
}

export interface Payment {
  id: string;
  billId: string;
  dormitoryId: string;
  tenantId: string;
  amount: number;
  method: 'cash' | 'transfer' | 'promptpay';
  status: 'pending' | 'completed' | 'failed';
  reference?: string; // เลขอ้างอิงการโอน หรือ Transaction ID
  evidence?: string; // URL รูปสลิป
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
  processedBy?: string; // ID ของผู้ดูแลที่ดำเนินการ
}

export interface PromptPayConfig {
  id: string;
  dormitoryId: string;
  type: 'personal' | 'corporate';
  number: string; // เบอร์โทร หรือ เลขประจำตัวผู้เสียภาษี
  name: string;
  isActive: boolean;
  qrCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LineNotifyConfig {
  id: string;
  dormitoryId: string;
  accessToken: string;
  isActive: boolean;
  notificationSettings: {
    billCreated: boolean; // แจ้งเตือนเมื่อสร้างบิลใหม่
    billDueReminder: boolean; // แจ้งเตือนก่อนครบกำหนดชำระ
    billOverdue: boolean; // แจ้งเตือนเมื่อค้างชำระ
    paymentReceived: boolean; // แจ้งเตือนเมื่อได้รับการชำระเงิน
    utilityReading: boolean; // แจ้งเตือนเมื่อบันทึกค่ามิเตอร์
  };
  createdAt: Date;
  updatedAt: Date;
}

// เพิ่ม interface สำหรับข้อมูลที่ส่งไปยัง Client Component
export interface SimplifiedDormitory {
  id: string;
  name: string;
  config?: {
    roomTypes?: {
      [key: string]: {
        id: string;
        name: string;
        basePrice: number;
        isDefault: boolean;
        airConditionerFee: number;
        parkingFee: number;
      };
    };
    additionalFees?: {
      airConditioner: number | null;
      parking: number | null;
      floorRates: Record<string, number>;
      utilities: {
        water: {
          perPerson: number | null;
        };
        electric: {
          unit: number | null;
        };
      };
    };
  };
}

export interface MeterReading {
  id: string;
  roomId: string;
  previousReading: number;
  currentReading: number;
  unitsUsed: number;
  readingDate: string;
  type: 'electric' | 'water';
  status: 'pending' | 'billed';
  createdAt: string;
  updatedAt: string;
} 