"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { saveMeterReading } from "@/lib/firebase/firebaseUtils";
import { TenantWithBillStatus, DormitoryConfig } from "@/types/dormitory";

interface UnrecordedMeterRoomProps {
  tenant: TenantWithBillStatus;
  selectedDormitory: string;
  config: DormitoryConfig;
  onSuccess: () => void;
}

export default function UnrecordedMeterRoom({ tenant, selectedDormitory, config, onSuccess }: UnrecordedMeterRoomProps) {
  const [currentReading, setCurrentReading] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleQuickMeterReading = async () => {
    if (!currentReading) {
      toast.error("กรุณากรอกค่ามิเตอร์");
      return;
    }

    const reading = parseFloat(currentReading);
    if (isNaN(reading)) {
      toast.error("ค่ามิเตอร์ไม่ถูกต้อง");
      return;
    }

    const previousReading = tenant.electricityUsage?.currentReading || 0;
    if (reading < previousReading) {
      toast.error("ค่ามิเตอร์ใหม่ต้องมากกว่าค่าเดิม");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const result = await saveMeterReading(selectedDormitory, {
        roomId: tenant.roomNumber,
        roomNumber: tenant.roomNumber,
        type: 'electric',
        previousReading,
        currentReading: reading,
        unitsUsed: reading - previousReading,
        readingDate: now
      });

      if (result.success) {
        toast.success("บันทึกค่ามิเตอร์เรียบร้อย");
        onSuccess();
      } else {
        toast.error(result.error?.toString() || "ไม่สามารถบันทึกค่ามิเตอร์ได้");
      }
    } catch (error) {
      console.error("Error saving meter reading:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกค่ามิเตอร์");
    } finally {
      setIsSubmitting(false);
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