import { Room, RoomType } from "@/types/dormitory";
import { Tenant } from "@/types/tenant";

interface DormitoryConfig {
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
      amount: number;
    }>;
    floorRates: {
      [key: string]: number | null;
    };
  };
  roomTypes: Record<string, RoomType>;
}

export const calculateTotalPrice = (
  room: Room, 
  roomTypes: RoomType[], 
  dormitoryConfig: DormitoryConfig,
  tenant?: Tenant | null
) => {
  // หา roomType จาก config ของหอพัก
  const roomTypeFromConfig = dormitoryConfig.roomTypes[room.roomType];
  if (!roomTypeFromConfig) {
    console.warn(`ไม่พบข้อมูลประเภทห้อง ${room.roomType} ในการตั้งค่าของหอพัก`);
    return {
      total: 0,
      breakdown: {
        basePrice: 0,
        floorRate: 0,
        additionalServices: 0,
        water: 0,
        electricity: 0
      }
    };
  }
  
  // คำนวณราคาพื้นฐานจาก config ของหอพัก
  const basePrice = roomTypeFromConfig.basePrice;

  // คำนวณค่าส่วนเพิ่มตามชั้น
  const floorRate = dormitoryConfig?.additionalFees?.floorRates?.[room.floor.toString()] || 0;

  // คำนวณค่าบริการเพิ่มเติม
  let additionalServices = 0;
  if (room.additionalServices?.length && dormitoryConfig?.additionalFees?.items?.length) {
    room.additionalServices.forEach(serviceId => {
      const service = dormitoryConfig.additionalFees.items.find(item => item.id === serviceId);
      if (service) {
        additionalServices += service.amount;
      }
    });
  }

  // คำนวณค่าน้ำ
  let water = 0;
  if (tenant?.numberOfResidents && dormitoryConfig.additionalFees.utilities.water.perPerson) {
    water = tenant.numberOfResidents * dormitoryConfig.additionalFees.utilities.water.perPerson;
  }

  // คำนวณค่าไฟ
  let electricity = 0;
  if (tenant?.electricityUsage?.unitsUsed && dormitoryConfig.additionalFees.utilities.electric.unit) {
    electricity = tenant.electricityUsage.unitsUsed * dormitoryConfig.additionalFees.utilities.electric.unit;
  }

  return {
    total: basePrice + floorRate + additionalServices + water + electricity,
    breakdown: {
      basePrice,
      floorRate,
      additionalServices,
      water,
      electricity
    }
  };
}; 