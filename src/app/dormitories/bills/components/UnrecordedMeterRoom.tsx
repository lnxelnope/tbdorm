"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { saveMeterReading } from "@/lib/firebase/firebaseUtils";
import { Tenant, DormitoryConfig } from "@/types/dormitory";

interface TenantWithBillStatus extends Tenant {
  canCreateBill: boolean;
  daysUntilDue: number;
  hasMeterReading: boolean;
  lastMeterReadingDate?: Date;
  electricityUsage?: {
    previousReading: number;
    currentReading: number;
    unitsUsed: number;
    charge: number;
  };
}

interface UnrecordedMeterRoomProps {
  tenant: TenantWithBillStatus;
  selectedDormitory: string;
  config: DormitoryConfig;
  onSuccess: () => void;
}

export default function UnrecordedMeterRoom({ 
  tenant, 
  selectedDormitory, 
  config, 
  onSuccess 
}: UnrecordedMeterRoomProps) {
  const [currentReading, setCurrentReading] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleQuickMeterReading = async () => {
    if (!currentReading || isNaN(Number(currentReading))) {
      toast.error('กรุณากรอกค่ามิเตอร์ที่ถูกต้อง');
      return;
    }

    try {
      setIsSubmitting(true);
      const previousReading = tenant.electricityUsage?.currentReading || 0;
      const currentReadingNum = Number(currentReading);
      
      if (currentReadingNum < previousReading) {
        toast.error('ค่ามิเตอร์ปัจจุบันต้องมากกว่าค่ามิเตอร์เดิม');
        return;
      }

      const unitsUsed = currentReadingNum - previousReading;
      
      const meterData = {
        roomNumber: tenant.roomNumber,
        roomId: tenant.roomId,
        previousReading: previousReading,
        currentReading: currentReadingNum,
        unitsUsed: unitsUsed,
        readingDate: new Date().toISOString(),
        type: 'electric' as const
      };

      const result = await saveMeterReading(selectedDormitory, meterData);
      if (result.success) {
        toast.success('บันทึกค่ามิเตอร์เรียบร้อย');
        onSuccess();
      } else {
        throw new Error('ไม่สามารถบันทึกค่ามิเตอร์ได้');
      }
    } catch (error) {
      console.error('Error saving meter reading:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกค่ามิเตอร์');
    } finally {
      setIsSubmitting(false);
      setCurrentReading('');
    }
  };

  return (
    <div className="p-6 rounded-lg border border-yellow-200 bg-yellow-50">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium flex items-center gap-2">
            ห้อง {tenant.roomNumber}
            <span className="text-sm font-normal text-gray-500">
              ({tenant.name})
            </span>
          </h3>
          <p className="mt-2 text-sm text-yellow-600">
            สถานะ: รอการจดมิเตอร์ประจำเดือน
          </p>
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              ค่ามิเตอร์เดิม: {tenant.electricityUsage?.currentReading || 0}
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">ข้อมูลติดต่อ</p>
              <p className="text-sm">เลขบัตรประชาชน: {tenant.idCardNumber ? tenant.idCardNumber.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5') : '-'}</p>
              <p className="text-sm">เบอร์โทร: {tenant.phone || '-'}</p>
              <p className="text-sm">Line ID: {tenant.lineId || '-'}</p>
              <p className="text-sm">อีเมล: {tenant.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ข้อมูลสัญญา</p>
              <p className="text-sm">วันเข้าอยู่: {tenant.moveInDate ? new Date(tenant.moveInDate).toLocaleDateString('th-TH') : '-'}</p>
              <p className="text-sm">สถานะ: {tenant.status === 'active' ? 'อยู่ประจำ' : 'กำลังย้ายออก'}</p>
              <p className="text-sm">จำนวนผู้พักอาศัย: {tenant.numberOfOccupants || 1} คน</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="number"
              value={currentReading}
              onChange={(e) => setCurrentReading(e.target.value)}
              placeholder="ค่ามิเตอร์ปัจจุบัน"
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <button
            onClick={handleQuickMeterReading}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            จดมิเตอร์
          </button>
          <button
            onClick={() => router.push(`/dormitories/meter-reading?search=${tenant.roomNumber}&returnUrl=/dormitories/bills`)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ดูประวัติ
          </button>
        </div>
      </div>
    </div>
  );
} 