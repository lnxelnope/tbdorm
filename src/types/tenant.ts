export interface Tenant {
  id: string;
  name: string;
  idCard: string;
  phone: string;
  email: string;
  lineId: string;
  currentAddress: string;
  workplace: string;
  dormitoryId: string;
  roomNumber: string;
  startDate: string;
  deposit: number;
  numberOfResidents: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  outstandingBalance: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  dormitoryName?: string;
}
