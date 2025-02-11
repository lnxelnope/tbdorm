export interface RoomType {
  id: string;
  name: string;
  basePrice: number;
  isDefault: boolean;
  description?: string;
  facilities?: string[];
  size?: string;
}

export interface Bill {
  id: string;
  dormitoryId: string;
  tenantId: string;
  roomId: string;
  month: number;
  year: number;
  dueDate: string;
  items: Array<{
    name: string;
    amount: number;
  }>;
  status: "pending" | "paid" | "overdue";
  totalAmount: number;
  remainingAmount: number;
  paidAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  billId: string;
  tenantId: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'promptpay';
  paidAt: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingConditions {
  allowedDaysBeforeDueDate: number;
  requireMeterReading: boolean;
  waterBillingType: "perPerson" | "perUnit";
  electricBillingType: "perUnit";
  allowPartialBilling: boolean;
  minimumStayForBilling: number;
  gracePeriod: number;
  lateFeeRate: number;
  autoGenerateBill: boolean;
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
  description?: string;
}

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
    items: Array<{
      id: string;
      name: string;
      amount: number;
    }>;
    floorRates: {
      [key: string]: number | null;
    };
  };
  dueDate?: number;
  billingConditions?: BillingConditions;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  dormitoryId: string;
  number: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance';
  roomType: string;
  rent?: number;
  initialMeterReading: number;
  additionalServices?: string[];
  tenantName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  lineId: string;
  idCard: string;
  phone: string;
  email: string;
  currentAddress: string;
  workplace: string;
  dormitoryId: string;
  roomId: string;
  roomNumber: string;
  deposit: number;
  startDate: string;
  endDate?: string;
  status: "active" | "inactive" | "moving_out";
  createdAt: string;
  updatedAt: string;
  numberOfResidents: number;
  numberOfOccupants?: number;
  rentAdvance: number;
  outstandingBalance: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  notes?: string;
  documents?: {
    name: string;
    url: string;
  }[];
}

export interface TenantWithBillStatus extends Tenant {
  status: 'active' | 'inactive' | 'moving_out';
}

export interface TenantHistory extends Omit<Tenant, 'id'> {
  id: string;
  tenantId: string;
  leaveDate: string;
  leaveReason: 'incorrect_data' | 'end_contract';
  note?: string;
  createdAt: string;
  updatedAt: string;
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
  images: string[];
  config?: DormitoryConfig;
  dueDate?: number;
  billingConditions?: BillingConditions;
  totalFloors?: number;
  createdAt: string;
  updatedAt: string;
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
