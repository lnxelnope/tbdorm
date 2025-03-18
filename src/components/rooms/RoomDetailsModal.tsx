"use client";

import { useState, useEffect } from "react";
import { Room, RoomType, DormitoryConfig } from "@/types/dormitory";
import Modal from "@/components/ui/modal";
import { getRooms } from "@/lib/firebase/firebaseUtils";
import { calculateTotalPrice } from "@/app/dormitories/[id]/rooms/utils";
import { Tenant } from "@/types/tenant";

interface RoomDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormitoryId: string;
  roomNumber: string;
  roomTypes: RoomType[];
  config: DormitoryConfig;
  currentTenant?: Tenant | null;
}

export default function RoomDetailsModal({
  isOpen,
  onClose,
  dormitoryId,
  roomNumber,
  roomTypes,
  config,
  currentTenant
}: RoomDetailsModalProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoom = async () => {
      setLoading(true);
      const result = await getRooms(dormitoryId);
      if (result.success && result.data) {
        const foundRoom = result.data.find(r => r.number === roomNumber);
        setRoom(foundRoom || null);
      }
      setLoading(false);
    };

    if (isOpen) {
      fetchRoom();
    }
  }, [dormitoryId, roomNumber, isOpen]);

  const roomType = room ? roomTypes.find(type => type.id === room.roomType) : null;
  const totalPrice = room && roomType ? calculateTotalPrice(room, config, currentTenant).total : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">รายละเอียดห้อง {roomNumber}</h2>

        {loading ? (
          <div>กำลังโหลด...</div>
        ) : room && roomType ? (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">ข้อมูลทั่วไป</h3>
              <p className="text-sm">ประเภทห้อง: {roomType.name}</p>
              <p className="text-sm">ชั้น: {room.floor}</p>
              <p className="text-sm">
                สถานะ:{" "}
                {room.status === "available"
                  ? "ว่าง"
                  : room.status === "occupied"
                  ? "มีผู้เช่า"
                  : "ปิดปรับปรุง"}
              </p>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold">ค่าใช้จ่าย</h3>
              <div className="mt-2 space-y-2">
                <p className="text-sm">ค่าเช่าพื้นฐาน: {roomType.basePrice.toLocaleString()} บาท</p>
                {config.additionalFees.floorRates[room.floor.toString()] && (
                  <p className="text-sm">
                    ค่าชั้น {room.floor}: {config.additionalFees.floorRates[room.floor.toString()]?.toLocaleString()} บาท
                  </p>
                )}
                {room.additionalServices?.map(serviceId => {
                  const service = config.additionalFees.items.find(item => item.id === serviceId);
                  return service && (
                    <p key={service.id} className="text-sm">
                      {service.name}: {service.amount.toLocaleString()} บาท
                    </p>
                  );
                })}
                {currentTenant && config.additionalFees.utilities.water.perPerson && (
                  <p className="text-sm">
                    ค่าน้ำ ({currentTenant.numberOfResidents} คน): {(config.additionalFees.utilities.water.perPerson * currentTenant.numberOfResidents).toLocaleString()} บาท
                  </p>
                )}
                {currentTenant?.electricityUsage && config.additionalFees.utilities.electric.unit && (
                  <p className="text-sm">
                    ค่าไฟ ({currentTenant.electricityUsage.unitsUsed.toFixed(2)} หน่วย): {(currentTenant.electricityUsage.unitsUsed * config.additionalFees.utilities.electric.unit).toLocaleString()} บาท
                    <span className="text-xs text-gray-500 ml-2">
                      ({currentTenant.electricityUsage.previousReading} → {currentTenant.electricityUsage.currentReading})
                    </span>
                  </p>
                )}
                <p className="text-lg font-semibold mt-4">
                  รวมทั้งหมด: {totalPrice.toLocaleString()} บาท
                </p>
              </div>
            </div>

            {currentTenant && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold">ข้อมูลผู้เช่า</h3>
                <p className="text-sm">ชื่อ: {currentTenant.name}</p>
                <p className="text-sm">จำนวนผู้อยู่อาศัย: {currentTenant.numberOfResidents} คน</p>
                <p className="text-sm">ยอดค้างชำระ: {currentTenant.outstandingBalance?.toLocaleString() || 0} บาท</p>
              </div>
            )}

            {roomType.facilities && roomType.facilities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold">สิ่งอำนวยความสะดวก</h3>
                <ul className="list-disc list-inside mt-2">
                  {roomType.facilities.map((facility, index) => (
                    <li key={index} className="text-sm">{facility}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div>ไม่พบข้อมูลห้องพัก</div>
        )}
      </div>
    </Modal>
  );
} 