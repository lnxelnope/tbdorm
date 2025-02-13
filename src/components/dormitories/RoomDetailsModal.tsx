"use client";

import React from 'react';
import { useState, useEffect } from "react";
import { Room, RoomType } from "@/types/dormitory";
import { Tenant } from '@/types/tenant';
import { getTenant, getLatestMeterReading } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import Modal from '@/components/ui/modal';
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DormitoryConfig } from '@/types/dormitory';

interface RoomDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  roomType: RoomType;
  tenant: Tenant | null;
  dormitoryConfig: DormitoryConfig;
}

export function RoomDetailsModal({ isOpen, onClose, room, roomType, tenant, dormitoryConfig }: RoomDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentElectricReading, setCurrentElectricReading] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!isOpen) return;

      try {
        setIsLoading(true);
        const promises = [];

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
  }, [isOpen, room.number]);

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

  const calculateTotalPrice = () => {
    let total = roomType.basePrice;

    // คำนวณค่าห้องตามชั้น
    const floorRate = dormitoryConfig?.additionalFees?.floorRates?.[room.floor.toString()];
    if (floorRate) {
      total += floorRate;
    }

    // คำนวณค่าบริการเพิ่มเติม
    const additionalFees = dormitoryConfig?.additionalFees?.items || [];
    for (const fee of additionalFees) {
      total += fee.amount;
    }

    return total;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">รายละเอียดห้องพัก {room.number}</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">ข้อมูลห้องพัก</h3>
            <div className="space-y-2">
              <p>ชั้น: {room.floor}</p>
              <p>รูปแบบห้อง: {roomType.name}</p>
              {roomType.description && <p>รายละเอียด: {roomType.description}</p>}
              
              {roomType.facilities && roomType.facilities.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500">สิ่งอำนวยความสะดวก</p>
                  <div className="mt-1 space-y-1">
                    {roomType.facilities.map((facility) => (
                      <p key={facility}>• {facility}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">ค่าใช้จ่ายรายเดือน</h3>
            <div className="space-y-1">
              <p>• ค่าห้องพื้นฐาน {roomType.basePrice.toLocaleString()} บาท</p>
              {dormitoryConfig?.additionalFees?.floorRates?.[room.floor.toString()] && (
                <p>• ค่าชั้น (+{dormitoryConfig.additionalFees.floorRates[room.floor.toString()]?.toLocaleString() || 0} บาท)</p>
              )}
              {dormitoryConfig?.additionalFees?.items.map((fee) => (
                <p key={fee.id}>• {fee.name} (+{fee.amount.toLocaleString()} บาท)</p>
              ))}
              <p className="font-semibold mt-2">รวมทั้งหมด {calculateTotalPrice().toLocaleString()} บาท/เดือน</p>
            </div>
          </div>

          {tenant && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">ผู้เช่าปัจจุบัน</h3>
              <div className="space-y-2">
                <p>ชื่อ-นามสกุล: {tenant.name}</p>
                <p>เบอร์โทร: {tenant.phone}</p>
                <p>วันที่เข้าอยู่: {new Date(tenant.startDate).toLocaleDateString('th-TH')}</p>
                {tenant.emergencyContact && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mt-2">ผู้ติดต่อฉุกเฉิน</p>
                    <p>ชื่อ: {tenant.emergencyContact.name}</p>
                    <p>ความสัมพันธ์: {tenant.emergencyContact.relationship}</p>
                    <p>เบอร์โทร: {tenant.emergencyContact.phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
} 