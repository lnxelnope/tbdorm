"use client";

import { useState, useEffect } from "react";
import { Room, RoomType, Tenant } from "@/types/dormitory";
import { getTenant, getLatestMeterReading } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import Modal from "@/components/ui/modal";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoomDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  roomType: RoomType;
  dormitoryId: string;
}

export default function RoomDetailsModal({
  isOpen,
  onClose,
  room,
  roomType,
  dormitoryId,
}: RoomDetailsModalProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentElectricReading, setCurrentElectricReading] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!isOpen) return;

      try {
        setIsLoading(true);
        const promises = [];

        // โหลดข้อมูลผู้เช่า
        if (room.tenantId) {
          promises.push(
            getTenant(dormitoryId, room.tenantId).then((result) => {
              if (result.success && result.data) {
                setTenant(result.data);
              }
            })
          );
        }

        // โหลดข้อมูลค่าไฟล่าสุด
        promises.push(
          getLatestMeterReading(dormitoryId, room.number, "electric").then((result) => {
            if (result.success && result.data) {
              setCurrentElectricReading(result.data.currentReading);
            }
          })
        );

        await Promise.all(promises);
      } catch (error) {
        console.error("Error loading room details:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, room.tenantId, dormitoryId, room.number]);

  const getStatusColor = (status: Room["status"]) => {
    switch (status) {
      case "available":
        return "success";
      case "occupied":
        return "warning";
      case "maintenance":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusText = (status: Room["status"]) => {
    switch (status) {
      case "available":
        return "ว่าง";
      case "occupied":
        return "มีผู้เช่า";
      case "maintenance":
        return "ปรับปรุง";
      default:
        return status;
    }
  };

  // คำนวณราคารวม
  const calculateTotalPrice = () => {
    let total = roomType.basePrice;

    // บวกค่าแอร์
    if (room.hasAirConditioner && roomType.airConditionerFee) {
      total += roomType.airConditionerFee;
    }

    // บวกค่าที่จอดรถ
    if (room.hasParking && roomType.parkingFee) {
      total += roomType.parkingFee;
    }

    return total;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ห้อง ${room.number}`}>
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* ข้อมูลห้อง */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">สถานะ</p>
                  <Badge variant={getStatusColor(room.status)} className="mt-1">
                    {getStatusText(room.status)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-500">ราคารวม</p>
                  <p className="mt-1 text-lg font-semibold text-blue-600">
                    {calculateTotalPrice().toLocaleString()} บาท/เดือน
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">ชั้น</p>
                  <p className="mt-1">ชั้น {room.floor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">ประเภทห้อง</p>
                  <p className="mt-1">{roomType.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">สิ่งอำนวยความสะดวก</p>
                  <div className="mt-1 space-y-1">
                    {room.hasAirConditioner && (
                      <p>• เครื่องปรับอากาศ (+{roomType.airConditionerFee?.toLocaleString() || 0} บาท)</p>
                    )}
                    {room.hasParking && (
                      <p>• ที่จอดรถ (+{roomType.parkingFee?.toLocaleString() || 0} บาท)</p>
                    )}
                    {roomType.facilities?.map((facility) => (
                      <p key={facility}>• {facility}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">ค่าไฟเดือนปัจจุบัน</p>
                  <p className="mt-1">
                    {currentElectricReading !== null
                      ? `${currentElectricReading.toLocaleString()} หน่วย`
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* ข้อมูลผู้เช่า */}
            {room.status === "occupied" && tenant && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">ข้อมูลผู้เช่า</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">ชื่อ-นามสกุล</p>
                    <p className="mt-1">{`${tenant.firstName} ${tenant.lastName}`}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</p>
                    <p className="mt-1">{tenant.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">วันที่เข้าพัก</p>
                    <p className="mt-1">
                      {new Date(tenant.moveInDate).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  {tenant.emergencyContact && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">ผู้ติดต่อฉุกเฉิน</p>
                      <p className="mt-1">{tenant.emergencyContact.name}</p>
                      <p className="text-sm text-gray-500">
                        {tenant.emergencyContact.phoneNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
} 