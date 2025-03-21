import { useState, useEffect } from "react";
import { Dormitory, ExtendedDormitoryConfig, TenantWithBillStatus, Room, DormitoryConfig } from "@/types/dormitory";
import { Bill, BillItem } from "@/types/bill";
import { MeterReading } from "@/types/meter";
import { queryDormitories, getRooms, queryTenants, getLatestMeterReading, getDormitory } from "@/lib/firebase/firebaseUtils";
import { getBillsByDormitory, createBill, deleteBill } from "@/lib/firebase/billUtils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Search, Loader2, Trash2 } from "lucide-react";
import UnrecordedMeterRoom from "./UnrecordedMeterRoom";
import CreateBillModal from "./CreateBillModal";
import PaymentModal from "./PaymentModal";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

interface BillsListProps {
  config: ExtendedDormitoryConfig | null;
}

interface MeterReadingData extends MeterReading {
  readingDate: string;
  previousReading: number;
  currentReading: number;
  unitsUsed: number;
}

export default function BillsList({ config }: BillsListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { user, isAdmin } = useAuth();
  const router = useRouter();
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
  const [showAllTenants, setShowAllTenants] = useState(false);
  const [rooms, setRooms] = useState<Record<string, Room>>({});

  useEffect(() => {
    const checkAuth = async () => {
      if (!user) {
        // ถ้าไม่มี user ให้ redirect ไปหน้า login พร้อมกับ return URL
        const currentPath = window.location.pathname;
        router.push(`/login?redirectUrl=${encodeURIComponent(currentPath)}`);
        return;
      }

      try {
        // ตรวจสอบสิทธิ์การเข้าถึง
        const adminStatus = await isAdmin();
        if (adminStatus) {
          setIsAuthorized(true);
        } else {
          toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking authorization:', error);
        toast.error('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
      }
    };

    checkAuth();
  }, [user, isAdmin, router]);

  // โหลดข้อมูลหอพักเมื่อ component โหลดครั้งแรกและมีสิทธิ์เข้าถึง
  useEffect(() => {
    if (!isAuthorized) return;

    const loadDormitories = async () => {
      try {
        const result = await queryDormitories();
        if (result.success && result.data) {
          setDormitories(result.data);
          if (result.data.length > 0) {
            setSelectedDormitory(result.data[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading dormitories:", error);
        toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
      }
    };

    loadDormitories();
  }, [isAuthorized]);

  // โหลดข้อมูลบิลและผู้เช่าเมื่อเลือกหอพัก
  useEffect(() => {
    const loadData = async () => {
      if (!selectedDormitory) return;

      setIsLoading(true);
      try {
        // 1. โหลดข้อมูลหอพักเพื่อดึง config
        const dormResult = await getDormitory(selectedDormitory);
        console.log('ข้อมูลหอพัก:', dormResult);

        let roomPrices: Record<string, number> = {};
        if (dormResult.success && dormResult.data?.config?.roomTypes) {
          roomPrices = dormResult.data.config.roomTypes;
          console.log('ราคาห้องจาก config:', roomPrices);
        }

        // 2. โหลดข้อมูลห้องและผู้เช่า
        const [roomsResult, tenantsResult] = await Promise.all([
          getRooms(selectedDormitory),
          queryTenants(selectedDormitory)
        ]);

        // 3. สร้าง Map ของข้อมูลห้อง
        const roomsMap: Record<string, Room> = {};
        if (roomsResult.success && roomsResult.data) {
          roomsResult.data.forEach(room => {
            roomsMap[room.id] = {
              ...room,
              basePrice: roomPrices[room.roomType]?.basePrice || 0
            };
            console.log(`ข้อมูลห้อง ${room.id}:`, {
              id: room.id,
              number: room.number,
              roomType: room.roomType,
              basePrice: roomPrices[room.roomType]?.basePrice || 0
            });
          });
        }
        setRooms(roomsMap);

        // 4. เชื่อมข้อมูลผู้เช่ากับราคาห้อง
        if (tenantsResult.success && tenantsResult.data) {
          const tenantsWithRoomData = tenantsResult.data
            .filter(tenant => tenant.status === 'active' && tenant.roomId)
            .map(tenant => {
              const roomData = roomsMap[tenant.roomId];
              const roomConfig = roomData?.roomType ? roomPrices[roomData.roomType] : null;

              return {
                ...tenant,
                roomType: roomConfig?.name || 'default',
                basePrice: roomConfig?.basePrice || 0,
                floor: roomData?.floor || parseInt(tenant.roomNumber?.split('-')[0]) || 0,
                hasMeterReading: false,
                canCreateBill: false,
                daysUntilDue: 0
              };
            });

          console.log('ข้อมูลผู้เช่าที่เชื่อมกับราคาห้องแล้ว:', tenantsWithRoomData);
          setTenants(tenantsWithRoomData);
        }

      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedDormitory]);

  const handleRefresh = () => {
    if (selectedDormitory) {
      setIsLoading(true);
      const loadData = async () => {
        try {
          const result = await getBillsByDormitory(selectedDormitory);
          if (result.success && result.data) {
            setBills(result.data as Bill[]);
          }
        } catch (error) {
          console.error("Error refreshing bills:", error);
          toast.error("ไม่สามารถรีเฟรชข้อมูลได้");
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      tenant.name.toLowerCase().includes(query) ||
      tenant.roomNumber.toLowerCase().includes(query)
    );
  });

  const tenantsToShow = showAllTenants ? filteredTenants : filteredTenants.slice(0, 5);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>บิล/ใบแจ้งหนี้</CardTitle>
              <CardDescription>จัดการบิลและใบแจ้งหนี้ทั้งหมด</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* เลือกหอพัก */}
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
                  <option value="">เลือกหอพัก</option>
                  {dormitories.map((dormitory) => (
                    <option key={dormitory.id} value={dormitory.id}>
                      {dormitory.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  ค้นหา
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="ค้นหาด้วยชื่อหรือเลขห้อง"
                />
              </div>
            </div>

            {/* แสดงรายการห้องที่ยังไม่ได้จดมิเตอร์ */}
            {selectedDormitory && tenantsToShow.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">รายการห้องที่ยังไม่ได้จดมิเตอร์</h3>
                {tenantsToShow.map((tenant) => (
                  !tenant.hasMeterReading && (
                    <UnrecordedMeterRoom
                      key={tenant.id}
                      tenant={tenant}
                      selectedDormitory={selectedDormitory}
                      config={config as DormitoryConfig}
                      onSuccess={handleRefresh}
                    />
                  )
                ))}
                {filteredTenants.length > 5 && !showAllTenants && (
                  <button
                    onClick={() => setShowAllTenants(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    แสดงทั้งหมด ({filteredTenants.length})
                  </button>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : selectedDormitory ? (
              bills.length > 0 ? (
                <div className="space-y-4">
                  {/* แสดงรายการบิล */}
                  {bills.map((bill) => (
                    <div key={bill.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">ห้อง {bill.roomNumber}</h4>
                          <p className="text-sm text-gray-500">
                            {bill.tenantName} - {new Date(bill.dueDate).toLocaleDateString('th-TH')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{bill.totalAmount.toLocaleString()} บาท</p>
                          <p className={`text-sm ${
                            bill.status === 'paid' ? 'text-green-600' :
                            bill.status === 'overdue' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {bill.status === 'paid' ? 'ชำระแล้ว' :
                             bill.status === 'overdue' ? 'เกินกำหนด' :
                             'รอชำระ'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  ไม่พบข้อมูลบิล
                </div>
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                กรุณาเลือกหอพัก
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateBillModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleRefresh}
          selectedRoom={selectedRoom}
          dormitoryId={selectedDormitory}
        />
      )}

      {isPaymentModalOpen && selectedBill && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handleRefresh}
          bill={selectedBill}
          dormitoryId={selectedDormitory}
        />
      )}
    </div>
  );
} 