'use client';

import React, { useState, useEffect } from 'react';
import { getActiveTenants } from '@/lib/firebase/firebaseUtils';
import { getBillStatus } from '@/lib/bills/billUtils';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { DormitoryConfig } from '@/types/dormitory';
import { Tenant } from '@/types/tenant';

interface TenantWithBillStatus extends Tenant {
  hasMeterReading?: boolean;
  lastMeterReadingDate?: Date;
  electricityUsage?: {
    unitsUsed: number;
    previousReading: number;
    currentReading: number;
    charge: number;
  };
  canCreateBill?: boolean;
  statusMessage?: string;
}

interface BillsListProps {
  config: DormitoryConfig;
}

export function BillsList({ config }: BillsListProps) {
  const [tenants, setTenants] = useState<TenantWithBillStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        const activeRooms = await getActiveTenants();
        console.log("ข้อมูลที่ได้จาก getActiveTenants:", activeRooms);

        if (activeRooms.length === 0) {
          console.log("ไม่พบข้อมูลผู้เช่าที่ active");
        }

        const tenantsWithBilling = activeRooms.map(tenant => {
          const status = getBillStatus(tenant, config);
          console.log(`สถานะของห้อง ${tenant.roomNumber}:`, status);
          return {
            ...tenant,
            canCreateBill: status.canCreateBill,
            statusMessage: status.message
          };
        });

        setTenants(tenantsWithBilling);
      } catch (err) {
        console.error("เกิดข้อผิดพลาด:", err);
        setError("ไม่สามารถดึงข้อมูลผู้เช่าได้");
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [config]);

  if (loading) return <div>กำลังโหลดข้อมูล...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (tenants.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700">ไม่พบข้อมูลผู้เช่าที่สามารถออกบิลได้</p>
        <p className="text-sm text-yellow-600 mt-1">
          สาเหตุที่เป็นไปได้:
          <ul className="list-disc ml-5 mt-1">
            <li>ไม่มีผู้เช่าในระบบ</li>
            <li>ไม่มีห้องที่มีสถานะ active</li>
            <li>ยังไม่มีการจดมิเตอร์</li>
          </ul>
        </p>
      </div>
    );
  }

  // แยกรายการผู้เช่าเป็น 2 กลุ่ม
  const eligibleTenants = tenants.filter(tenant => tenant.canCreateBill);
  const ineligibleTenants = tenants.filter(tenant => !tenant.canCreateBill);

  return (
    <div className="space-y-8">
      {/* รายการผู้เช่าที่สามารถสร้างบิลได้ */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-green-700">รายการผู้เช่าที่สามารถสร้างบิล</h3>
        <div className="grid gap-4">
          {eligibleTenants.map((tenant) => (
            <div
              key={tenant.id}
              className="p-4 rounded-lg border border-green-200 bg-green-50"
            >
              {/* ... existing tenant card content ... */}
            </div>
          ))}
          {eligibleTenants.length === 0 && (
            <p className="text-sm text-gray-500">- ไม่มีรายการที่สามารถสร้างบิลได้ -</p>
          )}
        </div>
      </div>

      {/* รายการผู้เช่าที่ไม่สามารถสร้างบิล */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-700">รายการผู้เช่าที่ยังไม่สามารถสร้างบิล</h3>
        <div className="grid gap-4">
          {ineligibleTenants.map((tenant) => (
            <div
              key={tenant.id}
              className="p-4 rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    ห้อง {tenant.roomNumber} - {tenant.name}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-red-600">
                      สาเหตุ: {tenant.statusMessage}
                    </p>
                    {!tenant.hasMeterReading && (
                      <button
                        onClick={() => router.push(`/dormitories/meter-reading?search=${tenant.roomNumber}&returnUrl=/dormitories/bills`)}
                        className="mt-2 inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        จดมิเตอร์
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {ineligibleTenants.length === 0 && (
            <p className="text-sm text-gray-500">- ไม่มีรายการที่รอดำเนินการ -</p>
          )}
        </div>
      </div>
    </div>
  );
} 