export interface RoomType {
  id: string;
  name: string;
  basePrice: number;
  isDefault: boolean;
  description: string;
  facilities: string[];
}

export interface BillItem {
  name: string;
  amount: number;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  utilityReading?: {
    previousReading: number;
    currentReading: number;
    unitsUsed: number;
  };
}

export interface Bill {
  id: string;
  dormitoryId: string;
  tenantId: string;
  roomId: string;
  month: number;
  year: number;
  dueDate: string;
  items: BillItem[];
  status: "pending" | "paid" | "overdue" | "partially_paid";
  totalAmount: number;
  remainingAmount: number;
  paidAmount: number;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  billId: string;
  dormitoryId: string;
  tenantId: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'promptpay';
  paidAt: Date;
  reference?: string;
  evidence?: string;
  status: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingConditions {
  waterBillingType: "perPerson" | "perUnit";
  electricBillingType: "perUnit";
  lateFeeRate: number;
  billingDay: number;
  gracePeriod?: number;
  dueDay: number;
}

export interface AdditionalFees {
  items: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  utilities: {
    water: {
      perPerson: number | null;
    };
    electric: {
      unit: number | null;
    };
  };
  floorRates?: Record<string, number>;
}

export interface AdditionalFeeItem {
  id: string;
  name: string;
  amount: number;
  isRequired: boolean;
}

export interface DormitoryConfig {
  roomTypes: Record<string, RoomTypeConfig>;
  additionalFees: {
    utilities: {
      water: { 
        perPerson: number | null;
        unit?: number | null;
      };
      electric: { 
        unit: number | null;
      };
    };
    items: AdditionalFeeItem[];
    floorRates: Record<string, number>;
  };
}

export interface RoomTypeConfig {
  name: string;
  basePrice: number;
  description?: string;
  additionalItems?: string[];
}

export interface Room {
  id: string;
  dormitoryId: string;
  number: string;
  floor: string;
  status: string;
  type: {
    id: string;
    name: string;
    basePrice: number;
  };
  tenant?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  waterMeter?: {
    previous: number;
    current: number;
    lastUpdated?: any;
  };
  electricityMeter?: {
    previous: number;
    current: number;
    lastUpdated?: any;
  };
  rent?: number;
  initialMeterReading: number;
  additionalServices?: string[];
  specialItems?: SpecialItem[];
  tenantId?: string;
  tenantName?: string;
  latestBillId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpecialItem {
  id: string;
  name: string;
  amount: number;
  duration: number; // 0 = ไม่มีกำหนด, > 0 = จำนวนรอบบิล
  startDate: string; // วันที่เริ่มต้น
  remainingBillingCycles?: number; // จำนวนรอบบิลที่เหลือ
}

export interface ExtendedDormitoryConfig {
  roomTypes: Record<string, RoomType>;
  additionalFees?: {
    floorRates?: Record<string, number>;
    utilities?: {
      electric?: {
        unit: number;
      };
      water?: {
        perPerson: number;
      };
    };
    items?: Array<{
      id: string;
      name: string;
      amount: number;
    }>;
  };
  roomRate?: number;
  waterRate?: number;
  electricityRate?: number;
  commonFee?: number;
}

export interface UtilityReading {
  id: string;
  roomId: string;
  dormitoryId: string;
  type: 'water' | 'electric';
  previousReading: number;
  currentReading: number;
  readingDate: Date;
  units: number;
  createdAt: Date;
  createdBy: string;
  isBilled: boolean;
  billId?: string;
}

export interface PromptPayConfig {
  id: string;
  dormitoryId: string;
  type: 'personal' | 'corporate';
  number: string;
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
    billCreated: boolean;
    billDueReminder: boolean;
    billOverdue: boolean;
    paymentReceived: boolean;
    utilityReading: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

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
      };
    };
    additionalFees?: {
      items: Array<{
        id: string;
        name: string;
        amount: number;
      }>;
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

export interface Dormitory {
  id: string;
  name: string;
  address: string;
  phone: string;
  description: string;
  location: {
    latitude: string;
    longitude: string;
  };
  totalFloors: number;
  totalRooms: number;
  facilities: string[];
  images: string[];
  status: 'active' | 'inactive';
  config?: DormitoryConfig;
  billingConditions?: BillingConditions;
  createdAt: any;
  updatedAt: any;
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

export const calculateTotalRent = (
  room: Room,
  roomType: RoomType,
  config: DormitoryConfig
): number => {
  let totalRent = roomType.basePrice;

  // Add floor rate if applicable
  if (config.additionalFees?.floorRates && config.additionalFees.floorRates[room.floor]) {
    totalRent += config.additionalFees.floorRates[room.floor] || 0;
  }

  // Add additional services
  if (room.additionalServices && room.additionalServices.length > 0) {
    room.additionalServices.forEach(serviceId => {
      const service = config.additionalFees?.items.find(item => item.id === serviceId);
      if (service) {
        totalRent += service.amount;
      }
    });
  }

  return totalRent;
};

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface Filters {
  floor: string;
  status: string;
  roomType: string;
  priceRange: {
    min: number;
    max: number;
  };
  additionalServices: string[];
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  roomId?: string;
  dormitoryId?: string;
  moveInDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantWithBillStatus extends Tenant {
  billStatus?: {
    currentBill?: {
      id: string;
      status: string;
      totalAmount: number;
      remainingAmount: number;
      dueDate: string;
    };
    lastBill?: {
      id: string;
      status: string;
      totalAmount: number;
      remainingAmount: number;
      dueDate: string;
    };
  };
}

export interface TenantHistory {
  id: string;
  tenantId: string;
  dormitoryId: string;
  roomId: string;
  moveInDate: string;
  moveOutDate?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillData {
  dormitoryId: string;
  roomId: string;
  roomNumber: string;
  tenantId: string;
  tenantName: string;
  month: number;
  year: number;
  dueDate: Date;
  status: string;
  items: BillItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments: Payment[];
  notificationsSent: {
    billCreated: boolean;
    billDueReminder: boolean;
    billOverdue: boolean;
  };
}

export interface BillsListProps {
  config: DormitoryConfig;
}
