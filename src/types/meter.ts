export interface MeterReading {
  id: string;
  readingDate: string;
  previousReading: number;
  currentReading: number;
  unitsUsed: number;
  meterType: 'electric' | 'water';
  roomNumber: string;
  dormitoryId: string;
  createdAt: any;
  updatedAt: any;
} 