"use client";

import { useState, useEffect, useMemo } from "react";
import { Room, RoomType } from "@/types/dormitory";
import Modal from "@/components/ui/modal";
import { getRooms } from "@/lib/firebase/firebaseUtils";
import { calculateTotalPrice } from "@/app/dormitories/[id]/rooms/utils";
import { Tenant } from "@/types/tenant";
import { useDormitoryConfig } from "@/lib/hooks/useDormitoryConfig";

interface RoomDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormitoryId: string;
  roomNumber: string;
  roomTypes: RoomType[];
  currentTenant?: Tenant | null;
  config?: any;
}

export default function RoomDetailsModal({
  isOpen,
  onClose,
  dormitoryId,
  roomNumber,
  roomTypes,
  currentTenant,
  config
}: RoomDetailsModalProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // ใช้ dormitoryConfig จาก props หรือจาก context
  const dormConfig = useDormitoryConfig();
  const dormitoryConfig = config || dormConfig.config;
  const isLoadingConfig = !config && dormConfig.isLoading;
  
  // เมื่อโมดาลเปิด ให้โหลดข้อมูลห้อง
  useEffect(() => {
    if (isOpen) {
      loadRoomData();
    }
  }, [isOpen, dormitoryId, roomNumber]);
  
  // ฟังก์ชันโหลดข้อมูลห้อง
  const loadRoomData = async () => {
    if (!isOpen || !dormitoryId || !roomNumber) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getRooms(dormitoryId);
      
      if (result.success && result.data) {
        // หาห้องตามหมายเลขห้อง
        const foundRoom = result.data.find(r => r.number === roomNumber);
        
        if (foundRoom) {
          setRoom(foundRoom);
        } else {
          setError("ไม่พบข้อมูลห้องพัก");
        }
      } else {
        setError("ไม่สามารถโหลดข้อมูลห้องพักได้");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูลห้องพัก");
    } finally {
      setIsLoading(false);
    }
  };
  
  // คำนวณราคาเมื่อข้อมูลเปลี่ยนแปลงเท่านั้น
  const priceDetails = useMemo(() => {
    if (!room || !dormitoryConfig) {
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
    return calculateTotalPrice(room, dormitoryConfig, currentTenant);
  }, [room, dormitoryConfig, currentTenant]);
  
  // ชื่อประเภทห้อง
  const roomTypeName = useMemo(() => {
    if (!room || !roomTypes) return "ไม่ระบุ";
    return roomTypes.find(type => type.id === room.roomType)?.name || "ไม่ระบุ";
  }, [room, roomTypes]);
  
  // แปลงสถานะห้องเป็นข้อความ
  const getRoomStatusText = (status?: string) => {
    switch (status) {
      case "available": return "ว่าง";
      case "occupied": return "มีผู้เช่า";
      case "maintenance": return "กำลังซ่อมบำรุง";
      case "abnormal": return "มีปัญหา";
      case "ready_for_billing": return "รอออกบิล";
      case "pending_payment": return "รอชำระเงิน";
      default: return "ไม่ระบุ";
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`รายละเอียดห้อง ${roomNumber}`}>
      {/* สถานะโหลด */}
      {isLoading || isLoadingConfig ? (
        <div className="flex justify-center items-center p-4 h-40">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-t-blue-600 border-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      ) : error ? (
        // แสดงข้อผิดพลาด
        <div className="p-4 text-center text-red-600">{error}</div>
      ) : room ? (
        // แสดงข้อมูลห้อง
        <div className="p-4 space-y-4">
          {/* ข้อมูลพื้นฐานห้อง */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">หมายเลขห้อง</h3>
              <p className="text-lg font-semibold">{room.number}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">ชั้น</h3>
              <p className="text-lg font-semibold">{room.floor}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">ประเภทห้อง</h3>
              <p className="text-lg font-semibold">{roomTypeName}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">สถานะ</h3>
              <p className="text-lg font-semibold">{getRoomStatusText(room.status)}</p>
            </div>
          </div>
          
          {/* ข้อมูลผู้เช่า (แสดงเฉพาะเมื่อมีผู้เช่า) */}
          {currentTenant && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-md font-medium mb-2">ข้อมูลผู้เช่า</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">ชื่อ-นามสกุล</h4>
                  <p>{currentTenant.name || "-"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</h4>
                  <p>{currentTenant.phone || "-"}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* ข้อมูลมิเตอร์ */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-medium mb-2">มิเตอร์น้ำและไฟ</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">มิเตอร์น้ำปัจจุบัน</h4>
                <p>{room.waterMeter?.current || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">มิเตอร์น้ำครั้งก่อน</h4>
                <p>{room.waterMeter?.previous || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">มิเตอร์ไฟปัจจุบัน</h4>
                <p>{room.electricityMeter?.current || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">มิเตอร์ไฟครั้งก่อน</h4>
                <p>{room.electricityMeter?.previous || "-"}</p>
              </div>
            </div>
          </div>
          
          {/* รายละเอียดราคา */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-medium mb-2">รายละเอียดราคา</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">ค่าเช่าพื้นฐาน</h4>
                <p>{priceDetails.breakdown.basePrice?.toLocaleString() || 0} บาท</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">ค่าชั้น</h4>
                <p>{priceDetails.breakdown.floorRate?.toLocaleString() || 0} บาท</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">ค่าบริการเพิ่มเติม</h4>
                <p>{priceDetails.breakdown.additionalServices?.toLocaleString() || 0} บาท</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">อื่นๆ</h4>
                <p>{priceDetails.breakdown.specialItems?.toLocaleString() || 0} บาท</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">ค่าน้ำ</h4>
                <p>{priceDetails.breakdown.water?.toLocaleString() || 0} บาท</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">ค่าไฟ</h4>
                <p>{priceDetails.breakdown.electricity?.toLocaleString() || 0} บาท</p>
              </div>
              <div className="col-span-2">
                <h4 className="text-sm font-medium text-gray-500">รวมทั้งสิ้น</h4>
                <p className="text-lg font-semibold text-blue-600">{priceDetails.total.toLocaleString() || 0} บาท</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ไม่พบข้อมูลห้อง
        <div className="p-4 text-center text-gray-500">ไม่พบข้อมูลห้องพัก</div>
      )}
    </Modal>
  );
} 