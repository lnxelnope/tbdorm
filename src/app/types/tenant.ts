export interface TenantWithBillStatus {
  id: string;
  roomNumber: string;
  name: string;
  // สถานะการสร้างบิล
  canCreateBill: boolean;
  daysUntilDue: number;
  hasMeterReading: boolean;
  lastMeterReadingDate?: Date;
  
  // ข้อมูลค่าใช้จ่าย
  roomRate: number;  // ค่าห้อง
  waterRate: number; // ค่าน้ำ
  
  // ค่าไฟฟ้า
  electricityUsage?: {
    previousReading: number;  // เลขมิเตอร์ครั้งก่อน
    currentReading: number;   // เลขมิเตอร์ปัจจุบัน
    unitsUsed: number;        // จำนวนหน่วยที่ใช้
    ratePerUnit: number;      // ค่าไฟต่อหน่วย
    charge: number;           // ค่าไฟรวม
  };
  
  // ค่าบริการเพิ่มเติม
  additionalFees: Array<{
    name: string;        // ชื่อค่าบริการ เช่น ค่าที่จอดรถ, ค่าอินเตอร์เน็ต
    amount: number;      // จำนวนเงิน
    description?: string; // คำอธิบายเพิ่มเติม
  }>;

  // ข้อมูลสถานะห้อง
  status: 'active' | 'moving_out' | 'inactive';
  moveInDate: Date;
  contractEndDate?: Date;
} 