import { Room, RoomType } from "@/types/dormitory";

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
}

export const calculateTotalPrice = (
  room: Room, 
  roomTypes: RoomType[], 
  dormitoryConfig: DormitoryConfig
) => {
  const roomType = Array.isArray(roomTypes) ? roomTypes.find(type => type.id === room.roomType) : null;
  let total = roomType?.basePrice || 0;

  // คำนวณค่าส่วนเพิ่มตามชั้น
  const floorRate = dormitoryConfig?.additionalFees?.floorRates?.[room.floor.toString()];
  if (floorRate) {
    total += floorRate;
  }

  // คำนวณค่าบริการเพิ่มเติม
  if (room.additionalServices?.length && dormitoryConfig?.additionalFees?.items?.length) {
    room.additionalServices.forEach(serviceId => {
      const service = dormitoryConfig.additionalFees.items.find(item => item.id === serviceId);
      if (service) {
        total += service.amount;
      }
    });
  }
  
  return total;
}; 