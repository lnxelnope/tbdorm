export interface Tenant {
  id: string;
  name: string;
  phone?: string;
  lineId?: string;
  idCard?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone?: string;
  };
  roomNumber: string;
  numberOfResidents?: number;
  moveInDate?: string;
  moveOutDate?: string;
  status: 'active' | 'moving_out' | 'moved_out';
  additionalServices?: string[];
  electricityUsage?: {
    unitsUsed: number;
  };
  currentAddress?: string;
  workplace?: string;
  dormitoryId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
}
