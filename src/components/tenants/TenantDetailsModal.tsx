"use client";

import { useState, useEffect } from "react";
import { Tenant } from "@/types/tenant";
import Modal from "@/components/ui/modal";
import { getTenant } from "@/lib/firebase/firebaseUtils";

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
      if (dormitoryId && tenantId && isOpen) {
        setIsLoading(true);
        try {
          const result = await getTenant(dormitoryId, tenantId);
          if (result.success && result.data) {
            setTenant(result.data);
          }
        } catch (error) {
          console.error("Error loading tenant:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadTenant();
  }, [dormitoryId, tenantId, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            ข้อมูลผู้พัก {tenant?.name}
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
        ) : tenant ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">ชื่อ-นามสกุล</h3>
                <p className="mt-1 text-sm text-gray-900">{tenant.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">เลขห้อง</h3>
                <p className="mt-1 text-sm text-gray-900">{tenant.roomNumber}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</h3>
                <p className="mt-1 text-sm text-gray-900">{tenant.phone}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">อีเมล</h3>
                <p className="mt-1 text-sm text-gray-900">{tenant.email || "-"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">จำนวนผู้พักอาศัย</h3>
                <p className="mt-1 text-sm text-gray-900">{tenant.numberOfResidents} คน</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">ยอดค้างชำระ</h3>
                <p className="mt-1 text-sm text-gray-900">{tenant.outstandingBalance?.toLocaleString() || "0"} บาท</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">เงินประกัน</h3>
                <p className="mt-1 text-sm text-gray-900">{tenant.deposit?.toLocaleString() || "0"} บาท</p>
              </div>
            </div>

            {tenant.specialItems && tenant.specialItems.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">รายการพิเศษ</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายการ</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนเงิน</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ระยะเวลา</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">รอบที่เหลือ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tenant.specialItems.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{item.amount.toLocaleString()} บาท</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {item.duration === 0 ? 'ไม่มีกำหนด' : `${item.duration} รอบ`}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {item.duration === 0 ? '-' : (item.remainingBillingCycles !== undefined ? item.remainingBillingCycles : item.duration)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500">หมายเหตุ</h3>
              <p className="mt-1 text-sm text-gray-900">{tenant.notes || "-"}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">เอกสารแนบ</h3>
              <div className="mt-1">
                {tenant.documents && tenant.documents.length > 0 ? (
                  <ul className="space-y-2">
                    {tenant.documents.map((doc: any, index: number) => (
                      <li key={index} className="text-sm text-blue-600 hover:text-blue-800">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          {doc.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">ไม่มีเอกสารแนบ</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">ไม่พบข้อมูลผู้พัก</p>
          </div>
        )}
      </div>
    </Modal>
  );
} 