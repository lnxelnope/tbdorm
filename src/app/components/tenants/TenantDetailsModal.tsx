"use client";

import { useState, useEffect } from "react";
import { getTenant } from "@/lib/firebase/firebaseUtils";
import { Tenant } from "@/types/dormitory";
import { toast } from "sonner";
import Modal from "@/components/ui/modal";
import { Loader2 } from "lucide-react";

interface TenantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormitoryId: string;
  tenantId: string;
}

export default function TenantDetailsModal({
  isOpen,
  onClose,
  dormitoryId,
  tenantId,
}: TenantDetailsModalProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTenant = async () => {
      if (!isOpen || !tenantId) return;

      try {
        setIsLoading(true);
        const result = await getTenant(dormitoryId, tenantId);
        if (result.success && result.data) {
          setTenant(result.data);
        } else {
          toast.error("ไม่สามารถโหลดข้อมูลผู้เช่าได้");
        }
      } catch (error) {
        console.error("Error loading tenant:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า");
      } finally {
        setIsLoading(false);
      }
    };

    loadTenant();
  }, [isOpen, tenantId, dormitoryId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ข้อมูลผู้เช่า">
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : tenant ? (
          <div className="space-y-4">
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
                <p className="text-sm font-medium text-gray-500">อีเมล</p>
                <p className="mt-1">{tenant.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">เลขบัตรประชาชน</p>
                <p className="mt-1">{tenant.idCardNumber}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">ที่อยู่</p>
                <p className="mt-1">{tenant.address}</p>
              </div>
              {tenant.emergencyContact && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">ผู้ติดต่อฉุกเฉิน</p>
                  <div className="mt-1 space-y-1">
                    <p>ชื่อ: {tenant.emergencyContact.name}</p>
                    <p>เบอร์โทร: {tenant.emergencyContact.phoneNumber}</p>
                    <p>ความสัมพันธ์: {tenant.emergencyContact.relationship}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">วันที่เข้าพัก</p>
                <p className="mt-1">{new Date(tenant.moveInDate).toLocaleDateString("th-TH")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">วันที่ย้ายออก</p>
                <p className="mt-1">
                  {tenant.moveOutDate
                    ? new Date(tenant.moveOutDate).toLocaleDateString("th-TH")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">สถานะ</p>
                <p className="mt-1">
                  {tenant.status === "active" ? "กำลังพักอาศัย" : "ย้ายออกแล้ว"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">ไม่พบข้อมูลผู้เช่า</div>
        )}
      </div>
    </Modal>
  );
} 