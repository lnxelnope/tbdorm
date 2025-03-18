import { Room, RoomType, DormitoryConfig, SpecialItem } from "@/types/dormitory";
import { Tenant } from "@/types/tenant";

interface TotalPriceResult {
  total: number;
  breakdown: {
    basePrice: number;
    floorRate: number;
    additionalServices: number;
    specialItems: number;
    water: number;
    electricity: number;
  };
}

export const calculateTotalPrice = (
  room: Room, 
  config: DormitoryConfig,
  tenant?: Tenant | null
): TotalPriceResult => {
  // หา roomType จาก config ของหอพัก
  const roomType = config.roomTypes[room.roomType];
  if (!roomType) {
    console.warn(`ไม่พบข้อมูลประเภทห้อง ${room.roomType} ในการตั้งค่าของหอพัก`);
    return {
      total: 0,
      breakdown: {
        basePrice: 0,
        floorRate: 0,
        additionalServices: 0,
        specialItems: 0,
        water: 0,
        electricity: 0
      }
    };
  }
  
  // คำนวณราคาพื้นฐานจาก config ของหอพัก
  const basePrice = roomType.basePrice;

  // คำนวณค่าส่วนเพิ่มตามชั้น
  const floorRate = config?.additionalFees?.floorRates?.[room.floor.toString()] || 0;

  // คำนวณค่าบริการเพิ่มเติม
  let additionalServices = 0;
  if (room.additionalServices?.length && config?.additionalFees?.items?.length) {
    room.additionalServices.forEach(serviceId => {
      const service = config.additionalFees.items.find(item => item.id === serviceId);
      if (service) {
        additionalServices += service.amount;
      }
    });
  }

  // คำนวณค่ารายการพิเศษ (จากผู้เช่าแทนที่จะเป็นจากห้องพัก)
  let specialItems = 0;
  if (tenant?.specialItems?.length) {
    tenant.specialItems.forEach(item => {
      // ตรวจสอบว่ารายการนี้ยังอยู่ในช่วงที่ต้องจ่ายหรือไม่
      const isActive = item.duration === 0 || // ไม่มีกำหนด
                       (item.remainingBillingCycles !== undefined && item.remainingBillingCycles > 0); // ยังเหลือรอบบิลที่ต้องจ่าย
      
      if (isActive) {
        specialItems += item.amount;
      }
    });
  }

  // คำนวณค่าน้ำ
  let water = 0;
  if (tenant?.numberOfResidents && config.additionalFees.utilities.water.perPerson) {
    water = tenant.numberOfResidents * config.additionalFees.utilities.water.perPerson;
  }

  // คำนวณค่าไฟ
  let electricity = 0;
  if (tenant?.electricityUsage?.unitsUsed && config.additionalFees.utilities.electric.unit) {
    electricity = tenant.electricityUsage.unitsUsed * config.additionalFees.utilities.electric.unit;
  }

  const total = basePrice + floorRate + additionalServices + specialItems + water + electricity;

  return {
    total,
    breakdown: {
      basePrice,
      floorRate,
      additionalServices,
      specialItems,
      water,
      electricity
    }
  };
}; 