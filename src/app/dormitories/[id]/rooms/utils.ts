import { Room, RoomType } from "@/types/dormitory";

interface DormitoryConfig {
  additionalFees: {
    airConditioner: number | null;
    parking: number | null;
    floorRates: {
      [key: string]: number | null;
    };
    utilities: {
      water: {
        perPerson: number | null;
      };
      electric: {
        unit: number | null;
      };
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
  const floorRate = dormitoryConfig.additionalFees.floorRates[room.floor.toString()];
  if (floorRate) {
    total += floorRate;
  }

  // คำนวณค่าบริการเพิ่มเติม
  if (room.hasAirConditioner && dormitoryConfig.additionalFees.airConditioner) {
    total += dormitoryConfig.additionalFees.airConditioner;
  }
  if (room.hasParking && dormitoryConfig.additionalFees.parking) {
    total += dormitoryConfig.additionalFees.parking;
  }
  
  return total;
}; 