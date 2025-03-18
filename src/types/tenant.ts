import { SpecialItem } from './dormitory';

export interface Tenant {
  id: string;
  name: string;
  phone?: string;
  lineId?: string;
  idCard?: string;
  email?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone?: string;
  };
  roomNumber: string;
  roomId: string;
  roomType: string;
  dormitoryId: string;
  numberOfResidents?: number;
  moveInDate?: string;
  moveOutDate?: string;
  status: 'active' | 'moving_out' | 'moved_out';
  additionalServices?: string[];
  specialItems?: SpecialItem[];
  electricityUsage?: {
    unitsUsed: number;
    previousReading: number;
    currentReading: number;
    charge: number;
    readingDate?: string;
  };
  hasMeterReading?: boolean;
  lastMeterReadingDate?: string;
  deposit: number;
  currentAddress?: string;
  workplace?: string;
  startDate: string;
  outstandingBalance?: number;
  createdAt: string;
  updatedAt: string;
  lastPaymentDate?: string;
}

export interface TenantWithBillStatus extends Tenant {
  hasMeterReading: boolean;
  lastMeterReadingDate?: string;
  electricityUsage?: {
    unitsUsed: number;
    previousReading: number;
    currentReading: number;
    charge: number;
  };
  roomType: string;
  floor: number;
  numberOfResidents: number;
  additionalServices?: string[];
  canCreateBill: boolean;
  daysUntilDue: number;
  reason?: string;
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
