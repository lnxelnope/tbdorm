import { Tenant } from '@/types/dormitory';

interface BillStatus {
  canCreateBill: boolean;
  message: string;
}

export const getBillStatus = (tenant: Tenant, config: any): BillStatus => {
  // เช็คเงื่อนไขพื้นฐาน
  if (!tenant.roomNumber) {
    return {
      canCreateBill: false,
      message: "ไม่พบข้อมูลห้องพัก"
    };
  }

  if (!tenant.hasMeterReading) {
    return {
      canCreateBill: false,
      message: "ยังไม่ได้จดมิเตอร์ประจำเดือนนี้"
    };
  }

  if (tenant.status === 'moving_out') {
    return {
      canCreateBill: false,
      message: "ห้องอยู่ในสถานะแจ้งย้ายออก"
    };
  }

  // ถ้าผ่านเงื่อนไขทั้งหมด ให้สามารถสร้างบิลได้
  return {
    canCreateBill: true,
    message: "พร้อมสร้างบิล"
  };
}; 