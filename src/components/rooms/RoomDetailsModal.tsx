"use client";

import { useState, useEffect } from "react";
import { Room, RoomType, Tenant } from "@/types/dormitory";
import Modal from "@/components/ui/modal";
import { getRooms } from "@/lib/firebase/firebaseUtils";
import { calculateTotalRent } from "@/types/dormitory";

interface RoomDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormitoryId: string;
  roomNumber: string;
  roomTypes: RoomType[];
  config: any;
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRoom = async () => {
      if (dormitoryId && roomNumber && isOpen) {
        setIsLoading(true);
        try {
          const result = await getRooms(dormitoryId);
          if (result.success && result.data) {
            const foundRoom = result.data.find(r => r.number === roomNumber);
            if (foundRoom) {
              setRoom(foundRoom);
            }
          }
        } catch (error) {
          console.error("Error loading room:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadRoom();
  }, [dormitoryId, roomNumber, isOpen]);

  const roomType = room ? roomTypes.find(type => type.id === room.roomType) : null;
  const totalRent = room && roomType ? calculateTotalRent(room, roomType, config) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            ข้อมูลห้องพัก {room?.number}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">ปิด</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : room ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">ข้อมูลทั่วไป</h3>
                <div className="mt-2 space-y-2">
                  <p className="text-sm">เลขห้อง: {room.number.padStart(3, '0')}</p>
                  <p className="text-sm">ชั้น: {room.floor}</p>
                  <p className="text-sm">ประเภทห้อง: {roomType?.name || '-'}</p>
                  <p className="text-sm">สถานะ: 
                    <span className={`ml-2 inline-flex rounded-full px-2 text-xs font-semibold ${
                      room.status === 'available' 
                        ? 'bg-green-100 text-green-800'
                        : room.status === 'occupied'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {room.status === 'available' ? 'ว่าง' : room.status === 'occupied' ? 'มีผู้เช่า' : 'ปิดปรับปรุง'}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">ค่าเช่าและค่าบริการ</h3>
                <div className="mt-2 space-y-2">
                  <p className="text-sm">ค่าเช่าพื้นฐาน: {roomType?.basePrice.toLocaleString()} บาท</p>
                  <p className="text-sm">ค่าบริการเพิ่มเติม:</p>
                  <div className="pl-4">
                    {room.additionalServices?.map(serviceId => {
                      const service = config?.additionalFees?.items?.find((item: any) => item.id === serviceId);
                      return service && (
                        <p key={service.id} className="text-sm">
                          - {service.name}: {service.amount.toLocaleString()} บาท
                        </p>
                      );
                    })}
                  </div>
                  <p className="text-sm font-medium">รวมทั้งสิ้น: {totalRent.toLocaleString()} บาท</p>
                </div>
              </div>
            </div>

            {currentTenant && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">ข้อมูลผู้เช่าปัจจุบัน</h3>
                <div className="space-y-2">
                  <p className="text-sm">ชื่อ-นามสกุล: {currentTenant.name}</p>
                  <p className="text-sm">จำนวนผู้พัก: {currentTenant.numberOfResidents} คน</p>
                  <p className="text-sm">วันที่เข้าอยู่: {new Date(currentTenant.startDate).toLocaleDateString('th-TH')}</p>
                  <p className="text-sm">เงินประกัน: {currentTenant.deposit.toLocaleString()} บาท</p>
                  <p className="text-sm">ยอดค้างชำระ: {currentTenant.outstandingBalance.toLocaleString()} บาท</p>
                </div>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">มิเตอร์</h3>
              <div className="space-y-2">
                <p className="text-sm">เลขมิเตอร์เริ่มต้น: {room.initialMeterReading}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            ไม่พบข้อมูลห้องพัก
          </div>
        )}
      </div>
    </Modal>
  );
} 