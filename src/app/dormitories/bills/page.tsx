"use client";

import { useState, useEffect } from "react";
import { queryDormitories, getRooms, getDormitory, queryTenants, getLatestMeterReading, getDormitoryConfig } from "@/lib/firebase/firebaseUtils";
import { getBillsByDormitory } from "@/lib/firebase/billUtils";
import { Dormitory, Room, Tenant } from "@/types/dormitory";
import { Bill } from "@/types/bill";
import { Plus, Search, Loader2, Zap, XCircle, Clock, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CreateBillModal from "./components/CreateBillModal";
import PaymentModal from "./components/PaymentModal";
import { useRouter } from "next/navigation";

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

export default function BillsPage() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await getDormitoryConfig();
        setConfig(result);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading config:', error);
        toast.error('ไม่สามารถโหลดการตั้งค่าได้');
      }
    };

    loadConfig();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* หัวข้อหลัก */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">จัดการบิลค่าเช่า</h1>
        <p className="mt-1 text-sm text-gray-500">
          จัดการการสร้างบิลและดูสถานะการชำระเงินของผู้เช่า
        </p>
      </div>

      {/* ส่วนของการกรองและค้นหา */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ... ส่วนของฟิลเตอร์ ... */}
        </div>
      </div>

      {/* ส่วนของรายการผู้เช่า */}
      <div className="grid grid-cols-1 gap-8">
        {/* รายการผู้เช่าทั้งหมด */}
        <BillsList config={config} />
      </div>

      {/* ส่วนของคำแนะนำ */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800">คำแนะนำ</h3>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
          <li>ผู้เช่าต้องมีการจดมิเตอร์ประจำเดือนก่อนจึงจะสามารถสร้างบิลได้</li>
          <li>บิลจะถูกสร้างตามรอบที่กำหนดในการตั้งค่า</li>
          <li>สามารถจดมิเตอร์ได้โดยคลิกที่ปุ่ม "จดมิเตอร์" ในรายการ</li>
        </ul>
      </div>
    </div>
  );
}

function BillsList({ config }) {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState<string>('');
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tenants, setTenants] = useState<TenantWithBillStatus[]>([]);
  const router = useRouter();

  // โหลดข้อมูลหอพักทั้งหมด
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await queryDormitories();
        if (result.success && result.data) {
          const dormsWithRooms = await Promise.all(
            result.data.map(async (dorm) => {
              const roomsResult = await getRooms(dorm.id);
              return {
                ...dorm,
                rooms: roomsResult.success ? roomsResult.data : []
              };
            })
          );
          setDormitories(dormsWithRooms);
          if (dormsWithRooms.length > 0) {
            setSelectedDormitory(dormsWithRooms[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // โหลดข้อมูลบิล
  useEffect(() => {
    const loadBills = async () => {
      if (!selectedDormitory) return;

      try {
        const result = await getBillsByDormitory(selectedDormitory);
        if (result.success && result.data) {
          setBills(result.data);
        }
      } catch (error) {
        console.error("Error loading bills:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลบิล");
      }
    };

    loadBills();
  }, [selectedDormitory]);

  useEffect(() => {
    const fetchTenantsAndDueDate = async () => {
      try {
        setIsLoading(true);
        
        if (!selectedDormitory) return;
        
        // ดึงข้อมูลผู้เช่าทั้งหมดในหอพัก
        const tenantsResult = await queryTenants(selectedDormitory);
        if (!tenantsResult.success || !tenantsResult.data) {
          throw new Error("ไม่สามารถดึงข้อมูลผู้เช่าได้");
        }

        // กรองเฉพาะผู้เช่าที่มีสถานะ active
        const activeTenantsWithRoom = tenantsResult.data.filter(tenant => 
          tenant.status === 'active' && tenant.roomNumber
        );

        console.log('Active tenants:', activeTenantsWithRoom); // เพิ่ม log ตรวจสอบ

        const tenantsWithBillStatus = await Promise.all(
          activeTenantsWithRoom.map(async (tenant) => {
            // ดึงข้อมูลมิเตอร์ล่าสุด
            const meterResult = await getLatestMeterReading(
              selectedDormitory,
              tenant.roomNumber,
              'electric'
            );

            let hasMeterReading = false;
            let lastMeterReadingDate: Date | undefined;
            let electricityUsage = undefined;

            if (meterResult.success && meterResult.data) {
              const readingDate = new Date(meterResult.data.readingDate);
              const today = new Date();
              
              hasMeterReading = 
                readingDate.getMonth() === today.getMonth() && 
                readingDate.getFullYear() === today.getFullYear();

              lastMeterReadingDate = readingDate;

              if (hasMeterReading) {
                electricityUsage = {
                  previousReading: meterResult.data.previousReading,
                  currentReading: meterResult.data.currentReading,
                  unitsUsed: meterResult.data.unitsUsed,
                  charge: meterResult.data.unitsUsed * 8 // ใช้ค่าไฟเริ่มต้น 8 บาท/หน่วย
                };
              }
            }

            return {
              ...tenant,
              hasMeterReading,
              lastMeterReadingDate,
              electricityUsage,
              canCreateBill: hasMeterReading
            };
          })
        );

        console.log('Tenants with bill status:', tenantsWithBillStatus); // เพิ่ม log ตรวจสอบ

        setTenants(tenantsWithBillStatus);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedDormitory) {
      fetchTenantsAndDueDate();
    }
  }, [selectedDormitory]);

  const handlePayBill = (bill: Bill) => {
    setSelectedBill(bill);
    setIsPaymentModalOpen(true);
  };

  const handleCreateBill = (tenant: TenantWithBillStatus) => {
    if (!tenant.hasMeterReading) {
      toast.error("ไม่สามารถสร้างบิลได้เนื่องจากยังไม่ได้จดมิเตอร์");
      return;
    }

    if (!selectedDormitory) {
      toast.error("กรุณาเลือกหอพัก");
      return;
    }

    // เปลี่ยนเส้นทางไปยัง URL ที่ถูกต้อง
    router.push(`/dormitories/${selectedDormitory}/bills/create?roomId=${tenant.roomId}`);
  };

  // กรองข้อมูลบิล
  const filteredBills = bills.filter(bill => {
    const matchesDormitory = !selectedDormitory || bill.dormitoryId === selectedDormitory;
    const matchesStatus = !statusFilter || bill.status === statusFilter;
    const matchesSearch = !searchQuery || 
      bill.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.tenantName?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDormitory && matchesStatus && matchesSearch;
  });

  // ฟังก์ชันสำหรับแสดงสถานะ
  const getBillStatus = (tenant: TenantWithBillStatus, config: DormitoryConfig) => {
    // เช็คเงื่อนไขพื้นฐาน
    if (!tenant.roomNumber) {
      return {
        canCreateBill: false,
        message: "ไม่พบข้อมูลห้องพัก"
      };
    }

    if (!tenant.hasMeterReading) {
      return {
        canCreateBill: false,
        message: "ยังไม่ได้จดมิเตอร์ประจำเดือนนี้"
      };
    }

    if (tenant.status === 'moving_out') {
      return {
        canCreateBill: false,
        message: "ห้องอยู่ในสถานะแจ้งย้ายออก"
      };
    }

    // ถ้าผ่านเงื่อนไขทั้งหมด ให้สามารถสร้างบิลได้
    return {
      canCreateBill: true,
      message: "พร้อมสร้างบิล"
    };
  };

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const selectedDorm = dormitories.find(d => d.id === selectedDormitory);

  // ดึงเฉพาะห้องที่มีผู้เช่าและสถานะปกติ
  const activeRooms = tenants.filter(tenant => 
    tenant.tenantId && tenant.status === 'active'
  );

  const tenantsWithBilling = activeRooms.map(tenant => {
    const status = getBillStatus(tenant, config);
    return {
      ...tenant,
      canCreateBill: status.canCreateBill,
      statusMessage: status.message
    };
  });

  const statuses = tenantsWithBilling.map(tenant => getBillStatus(tenant, config));

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>บิล/ใบแจ้งหนี้</CardTitle>
              <CardDescription>จัดการบิลและใบแจ้งหนี้ทั้งหมด</CardDescription>
            </div>
            {selectedDormitory && (
              <button
                onClick={() => router.push(`/dormitories/${selectedDormitory}/bills/batch`)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                สร้างบิลประจำเดือน
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="dormitory" className="block text-sm font-medium text-gray-700 mb-1">
                  หอพัก
                </label>
                <select
                  id="dormitory"
                  value={selectedDormitory}
                  onChange={(e) => setSelectedDormitory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  {dormitories.map((dorm) => (
                    <option key={dorm.id} value={dorm.id}>
                      {dorm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  สถานะ
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  <option value="pending">รอชำระ</option>
                  <option value="paid">ชำระแล้ว</option>
                  <option value="overdue">เกินกำหนด</option>
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  ค้นหา
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="ค้นหาด้วยเลขห้อง, ชื่อผู้เช่า"
                  />
                </div>
              </div>
            </div>

            {/* แสดงรายการผู้เช่าที่สามารถสร้างบิลได้ */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">รายการผู้เช่าที่สามารถสร้างบิล</h3>
              <div className="grid gap-4">
                {tenants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    ไม่พบรายการผู้เช่าที่สามารถสร้างบิลได้
                  </div>
                ) : (
                  tenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className={`p-4 rounded-lg border ${
                        tenant.hasMeterReading
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">
                            ห้อง {tenant.roomNumber} - {tenant.name}
                          </h3>
                          <div className="space-y-1 mt-1">
                            {/* แสดงสถานะ */}
                            {(() => {
                              const status = getBillStatus(tenant, config);
                              return (
                                <div className={`flex items-center gap-1 ${
                                  status.canCreateBill
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {status.canCreateBill ? 'พร้อมสร้างบิล' : status.message}
                                </div>
                              );
                            })()}

                            {tenant.lastMeterReadingDate && (
                              <p className="text-sm text-gray-500">
                                จดมิเตอร์ล่าสุด: {tenant.lastMeterReadingDate.toLocaleDateString('th-TH')}
                              </p>
                            )}
                            {tenant.electricityUsage && (
                              <div className="mt-2 text-sm">
                                <p className="text-blue-600">
                                  หน่วยไฟที่ใช้: {tenant.electricityUsage.unitsUsed.toFixed(2)} หน่วย
                                </p>
                                <p className="text-green-600">
                                  ค่าไฟ: ฿{tenant.electricityUsage.charge.toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!tenant.hasMeterReading && (
                            <button
                              onClick={() => router.push(`/dormitories/meter-reading?search=${tenant.roomNumber}&returnUrl=/dormitories/bills`)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                            >
                              <Zap className="w-4 h-4 mr-1" />
                              จดมิเตอร์
                            </button>
                          )}
                          <button
                            onClick={() => handleCreateBill(tenant)}
                            disabled={!tenant.hasMeterReading}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              tenant.hasMeterReading
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            สร้างบิล
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ตารางแสดงรายการบิล */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เลขที่บิล
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หอพัก
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เลขห้อง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้เช่า
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ยอดรวม
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      กำหนดชำระ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill) => (
                      <tr key={bill.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {selectedDorm?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.roomNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bill.tenantName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ฿{bill.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            bill.status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : bill.status === 'overdue'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {bill.status === 'paid' && 'ชำระแล้ว'}
                            {bill.status === 'pending' && 'รอชำระ'}
                            {bill.status === 'overdue' && 'เกินกำหนด'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(bill.dueDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {bill.status !== 'paid' && (
                            <button
                              onClick={() => handlePayBill(bill)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              ชำระเงิน
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedRoom && (
        <CreateBillModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedRoom(null);
          }}
          dormitoryId={selectedDormitory}
          room={selectedRoom}
          onBillCreated={() => {
            // Refresh bills
            getBillsByDormitory(selectedDormitory).then(result => {
              if (result.success && result.data) {
                setBills(result.data);
              }
            });
          }}
        />
      )}

      {selectedBill && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedBill(null);
          }}
          bill={selectedBill}
          dormitoryId={selectedDormitory}
          onPaymentComplete={() => {
            // Refresh bills
            getBillsByDormitory(selectedDormitory).then(result => {
              if (result.success && result.data) {
                setBills(result.data);
              }
            });
          }}
        />
      )}
    </div>
  );
} 