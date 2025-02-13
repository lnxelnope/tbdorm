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
      if (!dormitoryId || !tenantId) return;

      try {
        setIsLoading(true);
        const result = await getTenant(dormitoryId, tenantId);
        if (result.success && result.data) {
          setTenant(result.data as Tenant);
        } else {
          toast.error("ไม่สามารถโหลดข้อมูลผู้เช่าได้");
        }
      } catch (error) {
        console.error('Error loading tenant:', error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า");
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadTenant();
    }
  }, [dormitoryId, tenantId, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ข้อมูลผู้เช่า">
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : tenant ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">ข้อมูลส่วนตัว</h3>
              <div className="mt-2 space-y-2">
                <p>
                  <span className="font-medium">ชื่อ-นามสกุล:</span>{" "}
                  {tenant.name}
                </p>
                <p>
                  <span className="font-medium">เบอร์โทร:</span>{" "}
                  {tenant.phone || "-"}
                </p>
                <p>
                  <span className="font-medium">Line ID:</span>{" "}
                  {tenant.lineId || "-"}
                </p>
                <p>
                  <span className="font-medium">เลขบัตรประชาชน:</span>{" "}
                  {tenant.idCard ? tenant.idCard.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, "$1-$2-$3-$4-$5") : "-"}
                </p>
                <p>
                  <span className="font-medium">ที่อยู่:</span>{" "}
                  {tenant.address || "-"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">ผู้ติดต่อฉุกเฉิน</h3>
              <div className="mt-2 space-y-2">
                {tenant.emergencyContact ? (
                  <>
                    <p>
                      <span className="font-medium">ชื่อ:</span>{" "}
                      {tenant.emergencyContact.name}
                    </p>
                    <p>
                      <span className="font-medium">ความสัมพันธ์:</span>{" "}
                      {tenant.emergencyContact.relationship}
                    </p>
                    <p>
                      <span className="font-medium">เบอร์โทร:</span>{" "}
                      {tenant.emergencyContact.phone || "-"}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">- ไม่มีข้อมูล -</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">ข้อมูลการเข้าพัก</h3>
              <div className="mt-2 space-y-2">
                <p>
                  <span className="font-medium">ห้อง:</span>{" "}
                  {tenant.roomNumber}
                </p>
                <p>
                  <span className="font-medium">จำนวนผู้พัก:</span>{" "}
                  {tenant.numberOfResidents || "-"} คน
                </p>
                <p>
                  <span className="font-medium">วันที่เข้าพัก:</span>{" "}
                  {tenant.moveInDate ? new Date(tenant.moveInDate).toLocaleDateString("th-TH") : "-"}
                </p>
                <p>
                  <span className="font-medium">วันที่ย้ายออก:</span>{" "}
                  {tenant.moveOutDate ? new Date(tenant.moveOutDate).toLocaleDateString("th-TH") : "-"}
                </p>
                <p>
                  <span className="font-medium">สถานะ:</span>{" "}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${
                    tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                    tenant.status === 'moving_out' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {tenant.status === 'active' ? 'กำลังพักอาศัย' :
                     tenant.status === 'moving_out' ? 'แจ้งย้ายออก' :
                     'ย้ายออกแล้ว'}
                  </span>
                </p>
              </div>
            </div>

            {tenant.additionalServices && tenant.additionalServices.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">บริการเสริม</h3>
                <div className="mt-2">
                  <ul className="list-disc list-inside space-y-1">
                    {tenant.additionalServices.map((service, index) => (
                      <li key={index}>{service}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            ไม่พบข้อมูลผู้เช่า
          </div>
        )}
      </div>
    </Modal>
  );
} 