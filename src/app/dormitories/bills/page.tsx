"use client";

import { useState, useEffect } from "react";
import { queryDormitories, getRooms, getDormitory, queryTenants, getLatestMeterReading, getDormitoryConfig, saveMeterReading, getRoom } from "@/lib/firebase/firebaseUtils";
import { getBillsByDormitory, createBill, deleteBill } from "@/lib/firebase/billUtils";
import { Dormitory, Room, Tenant, DormitoryConfig, RoomType } from "@/types/dormitory";
import { MeterReading } from "@/types/meter";
import { Bill, BillItem } from "@/types/bill";
import { Plus, Search, Loader2, Zap, XCircle, Clock, AlertCircle, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CreateBillModal from "./components/CreateBillModal";
import PaymentModal from "./components/PaymentModal";
import { useRouter } from "next/navigation";
import UnrecordedMeterRoom from "./components/UnrecordedMeterRoom";
import { calculateTotalPrice } from "../[id]/rooms/utils";

interface BillItemData {
  name: string;
  type: 'rent' | 'water' | 'electric' | 'other';
  amount: number;
  description?: string;
  unitPrice?: number;
  units?: number;
}

interface ExtendedDormitoryConfig extends DormitoryConfig {
  electricityRate?: number;
  waterRate?: number;
  roomRate?: number;
  commonFee?: number;
}

interface TenantWithBillStatus extends Tenant {
  hasMeterReading: boolean;
  lastMeterReadingDate?: Date;
  electricityUsage?: {
    unitsUsed: number;
    previousReading: number;
    currentReading: number;
    charge: number;
  };
  roomType: string;
  floor: number;
  numberOfResidents: number;
  additionalServices?: string[];
  canCreateBill: boolean;
  daysUntilDue: number;
  reason?: string;
  idCardNumber?: string;
  moveInDate?: string;
}

interface BillData {
  dormitoryId: string;
  roomNumber: string;
  tenantId: string;
  tenantName: string;
  month: number;
  year: number;
  dueDate: Date;
  items: BillItem[];
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments: any[];
  notificationsSent: {
    initial: boolean;
    reminder: boolean;
    overdue: boolean;
  };
}

interface RoomData {
  [key: string]: Room;
}

export default function BillsPage() {
  const [rooms, setRooms] = useState<RoomData>({});
  const [config, setConfig] = useState<DormitoryConfig | null>(null);
  const [selectedDormitory, setSelectedDormitory] = useState<string>("");
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [tenants, setTenants] = useState<TenantWithBillStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const router = useRouter();
  const [showAllTenants, setShowAllTenants] = useState(false);
  const [dormitoryConfig, setDormitoryConfig] = useState<DormitoryConfig | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getDormitoryConfig();
        setConfig(config as ExtendedDormitoryConfig);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading config:', error);
        toast.error('ไม่สามารถโหลดการตั้งค่าได้');
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    const loadDormitoryConfig = async () => {
      if (!selectedDormitory) return;
      
      try {
        const dormResult = await getDormitory(selectedDormitory);
        if (!dormResult.success || !dormResult.data?.config) {
          toast.error("ไม่พบข้อมูลการตั้งค่าของหอพัก");
          return;
        }

        const dormConfig = dormResult.data.config;
        setDormitoryConfig(dormConfig);
      } catch (error) {
        console.error('Error loading dormitory config:', error);
      }
    };

    loadDormitoryConfig();
  }, [selectedDormitory]);

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
          <li>สามารถจดมิเตอร์ได้โดยคลิกที่ปุ่ม &quot;จดมิเตอร์&quot; ในรายการ</li>
        </ul>
      </div>
    </div>
  );
}

function BillsList({ config }: { config: ExtendedDormitoryConfig | null }) {
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
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [dormitoryConfig, setDormitoryConfig] = useState<DormitoryConfig | null>(null);
  const router = useRouter();
  const [showAllTenants, setShowAllTenants] = useState(false);

  // โหลดข้อมูลห้องพักและ config
  useEffect(() => {
    const loadData = async () => {
      if (!selectedDormitory) return;

      try {
        // ดึงข้อมูลห้องพักทั้งหมดในหอพัก
        const [roomsResult, dormResult] = await Promise.all([
          getRooms(selectedDormitory),
          getDormitory(selectedDormitory)
        ]);

        if (roomsResult.success && roomsResult.data) {
          const roomsMap: Record<string, Room> = {};
          (roomsResult.data as Room[]).forEach((room: Room) => {
            roomsMap[room.number] = room;
          });
          setRooms(roomsMap);
        }

        if (dormResult.success && dormResult.data?.config) {
          setDormitoryConfig(dormResult.data.config);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    };

    loadData();
  }, [selectedDormitory]);

  // คำนวณยอดรวม
  const calculateTotalAmount = (tenant: TenantWithBillStatus) => {
    const room = rooms[tenant.roomNumber];
    if (!room || !config?.roomTypes) return 0;
    
    return calculateTotalPrice(room, dormitoryConfig || config, tenant).total;
  };

  // แสดงรายละเอียดค่าใช้จ่าย
  const renderBillDetails = (tenant: TenantWithBillStatus) => {
    if (!config || !tenant.roomNumber) return null;

    const room = rooms[tenant.roomNumber];
    if (!room) return null;

    const priceDetails = calculateTotalPrice(room, dormitoryConfig || config, tenant);

    return (
      <div className="text-sm space-y-1">
        <div className="text-gray-900">
          <span className="font-medium">ค่าห้อง:</span> ฿{priceDetails.breakdown.basePrice.toLocaleString()}
        </div>
        {priceDetails.breakdown.floorRate !== 0 && (
          <div className={priceDetails.breakdown.floorRate < 0 ? "text-red-500" : "text-green-600"}>
            <span className="font-medium">ค่าชั้น {room.floor}:</span> {priceDetails.breakdown.floorRate > 0 ? '+' : ''}฿{priceDetails.breakdown.floorRate.toLocaleString()}
          </div>
        )}
        {priceDetails.breakdown.additionalServices > 0 && (
          <div className="text-gray-900">
            <span className="font-medium">ค่าบริการเพิ่มเติม:</span> +฿{priceDetails.breakdown.additionalServices.toLocaleString()}
          </div>
        )}
        {priceDetails.breakdown.water > 0 && (
          <div className="text-gray-900">
            <span className="font-medium">ค่าน้ำ ({tenant.numberOfResidents || 1} คน):</span> +฿{priceDetails.breakdown.water.toLocaleString()}
          </div>
        )}
        {priceDetails.breakdown.electricity > 0 && tenant.electricityUsage && (
          <div className="text-gray-900">
            <span className="font-medium">ค่าไฟ ({tenant.electricityUsage.unitsUsed.toFixed(2)} หน่วย):</span> +฿{priceDetails.breakdown.electricity.toLocaleString()}
            <div className="text-xs text-gray-500 ml-6">
              ({tenant.electricityUsage.previousReading} → {tenant.electricityUsage.currentReading})
            </div>
          </div>
        )}
        <div className="border-t pt-1 mt-1 font-medium">
          รวม: ฿{priceDetails.total.toLocaleString()}
        </div>
      </div>
    );
  };

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
          setBills(result.data as Bill[]);
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
              const reading = meterResult.data as MeterReading;
              const readingDate = new Date(reading.readingDate);
              const today = new Date();
              
              hasMeterReading = 
                readingDate.getMonth() === today.getMonth() && 
                readingDate.getFullYear() === today.getFullYear();

              lastMeterReadingDate = readingDate;

              if (hasMeterReading) {
                electricityUsage = {
                  previousReading: reading.previousReading,
                  currentReading: reading.currentReading,
                  unitsUsed: reading.unitsUsed,
                  charge: reading.unitsUsed * (config?.electricityRate || 8)
                };
              }
            }

            return {
              ...tenant,
              hasMeterReading,
              lastMeterReadingDate,
              electricityUsage,
              canCreateBill: hasMeterReading
            } as TenantWithBillStatus;
          })
        );

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
  }, [selectedDormitory, config?.electricityRate]);

  const handlePayBill = (bill: Bill) => {
    setSelectedBill(bill);
    setIsPaymentModalOpen(true);
  };

  const handleCreateBill = async (tenant: TenantWithBillStatus) => {
    if (!tenant.hasMeterReading) {
      toast.error("ไม่สามารถสร้างบิลได้เนื่องจากยังไม่ได้จดมิเตอร์");
      return;
    }

    if (!config) {
      toast.error("ไม่พบการตั้งค่าของหอพัก");
      return;
    }

    try {
      // ดึงข้อมูลหอพัก
      const dormitory = dormitories.find(d => d.id === selectedDormitory);
      if (!dormitory?.config?.roomTypes) {
        toast.error("ไม่พบข้อมูลราคาห้องพัก กรุณาตั้งค่าราคาห้องพักก่อน");
        return;
      }

      // ดึงข้อมูลห้องพัก
      const roomData = await getRoom(selectedDormitory, tenant.roomNumber);
      if (!roomData.success || !roomData.data) {
        toast.error("ไม่พบข้อมูลห้องพัก");
        return;
      }

      // หาราคาห้องจาก roomType ของห้อง
      const roomTypeData = config.roomTypes?.[roomData.data.roomType];
      if (!roomTypeData?.basePrice) {
        toast.error("ไม่พบข้อมูลราคาห้องพัก กรุณาตรวจสอบการตั้งค่าราคาห้องพัก");
        return;
      }

      const waterFeePerPerson = config.additionalFees?.utilities?.water?.perPerson || 0;
      const numberOfOccupants = tenant.numberOfResidents || 1;
      const waterFee = waterFeePerPerson * numberOfOccupants;
      const electricityFee = tenant.electricityUsage?.charge || 0;

      const items: BillItem[] = [
        {
          type: "rent",
          name: "ค่าห้องพัก",
          amount: roomTypeData.basePrice,
          description: `ค่าเช่าห้องพักประจำเดือน ${new Date().getMonth() + 1}/${new Date().getFullYear()}`
        },
        {
          type: "water",
          name: "ค่าน้ำประปา",
          amount: waterFee,
          description: `ค่าน้ำประปาแบบเหมาจ่าย (${numberOfOccupants} คน)`,
          unit: numberOfOccupants,
          rate: waterFeePerPerson
        }
      ];

      // เพิ่มค่าไฟถ้ามีการจดมิเตอร์
      if (tenant.electricityUsage) {
        items.push({
          type: "electric",
          name: "ค่าไฟฟ้า",
          amount: electricityFee,
          description: `ค่าไฟฟ้า ${tenant.electricityUsage.unitsUsed} หน่วย (${tenant.electricityUsage.previousReading} - ${tenant.electricityUsage.currentReading})`,
          unit: tenant.electricityUsage.unitsUsed,
          rate: config.additionalFees?.utilities?.electric?.unit || 0
        });
      }

      const totalAmount = items.reduce((sum: number, item: BillItem) => sum + item.amount, 0);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (config.dueDate || 5));

      const billData: BillData = {
        dormitoryId: selectedDormitory,
        roomNumber: tenant.roomNumber,
        tenantId: tenant.id,
        tenantName: tenant.name,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        dueDate,
        items,
        status: "pending",
        totalAmount,
        remainingAmount: totalAmount,
        paidAmount: 0,
        payments: [],
        notificationsSent: {
          initial: false,
          reminder: false,
          overdue: false
        }
      };

      const result = await createBill(selectedDormitory, billData);
      if (result.success) {
        toast.success("สร้างบิลเรียบร้อยแล้ว");
        // Reload bills after creating new one
        const billsResult = await getBillsByDormitory(selectedDormitory);
        if (billsResult.success && billsResult.data) {
          setBills(billsResult.data as Bill[]);
        }
      } else {
        toast.error(result.error?.toString() || "ไม่สามารถสร้างบิลได้");
      }
    } catch (error) {
      console.error("Error creating bill:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
    }
  };

  const handleEditBill = async (bill: Bill) => {
    try {
      // ดึงข้อมูลมิเตอร์ล่าสุดของห้อง
      const meterResult = await getLatestMeterReading(
        selectedDormitory,
        bill.roomNumber,
        'electric'
      );

      // เก็บข้อมูลบิลเดิมไว้
      const originalBillId = bill.id;

      // ลบบิลเดิมออกจากรายการ
      const updatedBills = bills.filter(b => b.id !== originalBillId);
      setBills(updatedBills);

      // อัพเดทข้อมูลผู้เช่าให้สามารถสร้างบิลใหม่ได้
      const updatedTenants = tenants.map(t => {
        if (t.roomNumber === bill.roomNumber) {
          const meterData = meterResult.success && meterResult.data ? meterResult.data as MeterReading : null;
          return {
            ...t,
            hasMeterReading: true,
            electricityUsage: meterData ? {
              previousReading: meterData.previousReading,
              currentReading: meterData.currentReading,
              unitsUsed: meterData.unitsUsed,
              charge: meterData.unitsUsed * (config?.electricityRate || 8)
            } : undefined
          };
        }
        return t;
      });

      setTenants(updatedTenants);
      
      // ลบบิลเดิมจากฐานข้อมูล
      await deleteBill(selectedDormitory, originalBillId);

      toast.success('ย้ายบิลกลับไปแก้ไขเรียบร้อย');
    } catch (error) {
      console.error('Error editing bill:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขบิล');
    }
  };

  // เพิ่มฟังก์ชันลบบิล
  const handleDeleteBill = async (bill: Bill) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบบิลนี้?')) {
      return;
    }

    try {
      const result = await deleteBill(selectedDormitory, bill.id);
      if (result.success) {
        toast.success('ลบบิลเรียบร้อยแล้ว');
        // อัพเดทรายการบิล
        const updatedBills = bills.filter(b => b.id !== bill.id);
        setBills(updatedBills);
      } else {
        throw new Error(typeof result.error === 'string' ? result.error : 'เกิดข้อผิดพลาดในการลบบิล');
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('เกิดข้อผิดพลาดในการลบบิล');
    }
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
  const getBillStatus = (tenant: TenantWithBillStatus, config: ExtendedDormitoryConfig) => {
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

  // เพิ่มฟังก์ชันช่วยดึงข้อมูลห้อง
  const getRoomPrice = (roomNumber: string) => {
    const room = rooms[roomNumber];
    if (!room || !config?.roomTypes) return { name: 'ไม่ระบุ', price: 0 };

    const roomTypeConfig = config.roomTypes[room.roomType];
    return {
      name: roomTypeConfig?.name || 'ไม่ระบุ',
      price: roomTypeConfig?.basePrice || 0
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

  // ดึงเฉพาะห้องที่มีผู้เช่าและสถานะปกติ
  const activeRooms = tenants.filter(tenant => 
    tenant.id && tenant.status === 'active'
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

  // กรองผู้เช่าที่สามารถสร้างบิล
  const tenantsCanCreateBill = tenants
    .filter(tenant => {
      // เช็คว่ามีบิลในเดือนปัจจุบันหรือไม่
      const hasCurrentMonthBill = bills.some(bill => {
        const today = new Date();
        return bill.roomNumber === tenant.roomNumber && 
               bill.month === (today.getMonth() + 1) &&
               bill.year === today.getFullYear();
      });

      // แสดงเฉพาะผู้เช่าที่:
      // 1. ไม่มีบิลในเดือนปัจจุบัน
      // 2. มีการจดมิเตอร์
      // 3. สถานะเป็น active
      // 4. มีข้อมูลการใช้ไฟฟ้า
      return !hasCurrentMonthBill && 
             tenant.hasMeterReading && 
             tenant.status === 'active' &&
             tenant.electricityUsage !== undefined;
    })
    .sort((a, b) => {
      // เรียงตามเลขห้อง
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });

  // เพิ่ม console.log เพื่อตรวจสอบ
  console.log('ข้อมูลผู้เช่าทั้งหมด:', tenants.map(t => ({
    room: t.roomNumber,
    hasMeter: t.hasMeterReading,
    hasElectricityUsage: t.electricityUsage !== undefined,
    status: t.status
  })));

  // เพิ่มฟังก์ชันสร้างบิลทั้งหมด
  const handleCreateAllBills = async () => {
    if (!selectedDormitory || !tenantsCanCreateBill.length) {
      toast.error('ไม่มีรายการที่สามารถสร้างบิลได้');
      return;
    }

    try {
      setIsLoading(true);
      let successCount = 0;
      let errorCount = 0;

      // สร้างบิลทีละรายการ
      for (const tenant of tenantsCanCreateBill) {
        try {
          // สร้างรายการในบิล
          const billItems: BillItem[] = [
            {
              type: 'rent',
              name: 'ค่าเช่าห้องพัก',
              description: 'ค่าเช่าห้องพัก',
              amount: getRoomPrice(tenant.roomNumber).price
            }
          ];

          if (tenant.electricityUsage) {
            billItems.push({
              type: 'electric',
              name: 'ค่าไฟฟ้า',
              description: 'ค่าไฟฟ้า',
              amount: tenant.electricityUsage.charge,
              unit: tenant.electricityUsage.unitsUsed,
              rate: config?.additionalFees?.utilities?.electric?.unit || 0
            });
          }

          billItems.push({
            type: 'water',
            name: 'ค่าน้ำประปา',
            description: 'ค่าน้ำประปา',
            amount: config?.waterRate || 0
          });

          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7);

          const billData: BillData = {
            dormitoryId: selectedDormitory,
            roomNumber: tenant.roomNumber,
            tenantId: tenant.id,
            tenantName: tenant.name,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            dueDate,
            items: billItems,
            status: "pending",
            totalAmount: await calculateTotalAmount(tenant),
            remainingAmount: await calculateTotalAmount(tenant),
            paidAmount: 0,
            payments: [],
            notificationsSent: {
              initial: false,
              reminder: false,
              overdue: false
            }
          };

          const result = await createBill(selectedDormitory, billData);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Error creating bill for room', tenant.roomNumber, error);
          errorCount++;
        }
      }

      // อัพเดทข้อมูลบิลและรายการผู้เช่า
      const billsResult = await getBillsByDormitory(selectedDormitory);
      if (billsResult.success && billsResult.data) {
        setBills(billsResult.data as Bill[]);
      }

      // อัพเดทรายการผู้เช่า
      const updatedTenants = tenants.map(t => ({
        ...t,
        hasMeterReading: false
      }));
      setTenants(updatedTenants);

      toast.success(`สร้างบิลสำเร็จ ${successCount} รายการ${errorCount > 0 ? `, ไม่สำเร็จ ${errorCount} รายการ` : ''}`);
    } catch (error) {
      console.error('Error creating all bills:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างบิล');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
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

            {/* ส่วนของผู้เช่าที่ยังไม่ได้จดมิเตอร์ */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">
                รายการผู้เช่าที่ยังไม่ได้จดมิเตอร์ ({tenants.filter(tenant => 
                  tenant.status === 'active' && 
                  (!tenant.electricityUsage || 
                   tenant.electricityUsage.previousReading === tenant.electricityUsage.currentReading)
                ).length} ห้อง)
              </h3>
              <div className="grid gap-4">
                {tenants.filter(tenant => 
                  tenant.status === 'active' && 
                  (!tenant.electricityUsage || 
                   tenant.electricityUsage.previousReading === tenant.electricityUsage.currentReading)
                ).map((tenant) => (
                  <UnrecordedMeterRoom
                    key={tenant.id}
                    tenant={tenant}
                    selectedDormitory={selectedDormitory}
                    config={config}
                    onSuccess={() => {
                      if (selectedDormitory) {
                        const tenantsResult = queryTenants(selectedDormitory).then(result => {
                          if (result.success && result.data) {
                            const activeTenantsWithRoom = result.data.filter(tenant => 
                              tenant.status === 'active' && tenant.roomNumber
                            );

                            Promise.all(
                              activeTenantsWithRoom.map(async (tenant) => {
                                const meterResult = await getLatestMeterReading(
                                  selectedDormitory,
                                  tenant.roomNumber,
                                  'electric'
                                );

                                let hasMeterReading = false;
                                let lastMeterReadingDate: Date | undefined;
                                let electricityUsage = undefined;

                                if (meterResult.success && meterResult.data) {
                                  const reading = meterResult.data as MeterReading;
                                  const readingDate = new Date(reading.readingDate);
                                  const today = new Date();
                                  
                                  hasMeterReading = 
                                    readingDate.getMonth() === today.getMonth() && 
                                    readingDate.getFullYear() === today.getFullYear();

                                  lastMeterReadingDate = readingDate;

                                  if (hasMeterReading) {
                                    electricityUsage = {
                                      previousReading: reading.previousReading,
                                      currentReading: reading.currentReading,
                                      unitsUsed: reading.unitsUsed,
                                      charge: reading.unitsUsed * (config?.electricityRate || 8)
                                    };
                                  }
                                }

                                return {
                                  ...tenant,
                                  hasMeterReading,
                                  lastMeterReadingDate,
                                  electricityUsage,
                                  canCreateBill: hasMeterReading
                                } as TenantWithBillStatus;
                              })
                            ).then(tenantsWithBillStatus => {
                              setTenants(tenantsWithBillStatus);
                            });
                          }
                        });
                      }
                    }}
                  />
                ))}
                  </div>
            </div>

            {/* ส่วนของผู้เช่าที่จดมิเตอร์แล้ว */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">รายการผู้เช่าที่พร้อมสร้างบิล ({tenantsCanCreateBill.length} ห้อง)</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAllTenants(!showAllTenants)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showAllTenants ? 'แสดงห้องเดียว' : 'แสดงทั้งหมด'}
                  </button>
                  {tenantsCanCreateBill.length > 0 && (
                    <button
                      onClick={handleCreateAllBills}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      สร้างบิลทั้งหมด ({tenantsCanCreateBill.length})
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-4">
                {(showAllTenants ? tenantsCanCreateBill : tenantsCanCreateBill.slice(0, 1)).map((tenant) => (
                    <div
                      key={tenant.id}
                    className="p-6 rounded-lg border border-green-200 bg-green-50"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* ข้อมูลผู้เช่า */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-lg font-medium flex items-center gap-2">
                            ห้อง {tenant.roomNumber}
                            <span className="text-sm font-normal text-gray-500">
                              ({tenant.name})
                            </span>
                          </h3>
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
                            </div>
                          </div>
                                </div>

                        {/* ข้อมูลค่าใช้จ่าย */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="font-medium mb-3">รายการค่าใช้จ่าย</h4>
                          {renderBillDetails(tenant)}
                        </div>

                        {/* สถานะการจดมิเตอร์ */}
                        <div>
                            {tenant.lastMeterReadingDate && (
                            <p className="text-sm text-gray-600">
                                จดมิเตอร์ล่าสุด: {tenant.lastMeterReadingDate.toLocaleDateString('th-TH')}
                              </p>
                            )}
                            {tenant.electricityUsage && (
                            <div className="mt-1">
                              <p className="text-sm text-blue-600">
                                มิเตอร์ไฟฟ้า: {tenant.electricityUsage.previousReading} → {tenant.electricityUsage.currentReading}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                      {/* ปุ่มดำเนินการ */}
                      <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleCreateBill(tenant)}
                          className="px-4 py-2 rounded-lg text-sm font-medium w-full bg-green-600 text-white hover:bg-green-700"
                          >
                            สร้างบิล
                          </button>
                        </div>
                      </div>
                    </div>
                ))}
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
                          {dormitories.find(d => d.id === selectedDormitory)?.name}
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
                          <div className="flex justify-end gap-2">
                          {bill.status !== 'paid' && (
                              <>
                            <button
                              onClick={() => handlePayBill(bill)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              ชำระเงิน
                            </button>
                                <button
                                  onClick={() => handleEditBill(bill)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                >
                                  แก้ไข
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteBill(bill)}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              ลบ
                            </button>
                          </div>
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
          onSuccess={() => {
            setIsCreateModalOpen(false);
            // Reload bills
            getBillsByDormitory(selectedDormitory).then((result) => {
              if (result.success && result.data) {
                setBills(result.data as Bill[]);
              }
            });
          }}
          selectedRoom={selectedRoom}
          dormitoryId={selectedDormitory}
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
          onSuccess={() => {
            getBillsByDormitory(selectedDormitory).then(result => {
              if (result.success && result.data) {
                setBills(result.data as Bill[]);
              }
            });
          }}
        />
      )}
    </div>
  );
} 