"use client";

import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Filter, ArrowLeft, Trash2, UserPlus, Edit, Zap, X, FileText, CheckSquare, AlertCircle } from "lucide-react";
import { DormitoryConfig, Room, RoomType, AdditionalFeeItem, Dormitory } from "@/types/dormitory";
import { Tenant } from "@/types/tenant";
import Link from "next/link";
import { collection, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { 
  deleteRoom, 
  updateRoom, 
  saveMeterReading, 
  updateTenant, 
  getLatestMeterReading, 
  getRooms,
  getRoomTypes,
  getDormitory,
  queryTenants,
  updateRoomStatus,
  getDormitoryConfig,
  getRoom,
} from "@/lib/firebase/firebaseUtils";
import { 
  getBillsByDormitory,
  createBill,
  updateBillStatus,
  getBill,
  createBills
} from "@/lib/firebase/billUtils";
import { recordPayment } from "@/lib/firebase/paymentUtils";
import AddRoomModal from "@/components/rooms/AddRoomModal";
import EditRoomModal from "@/components/rooms/EditRoomModal";
import { toast } from "sonner";
import { calculateTotalPrice } from "./utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import RoomDetailsModal from "@/components/rooms/RoomDetailsModal";
import AddTenantModal from "@/components/tenants/AddTenantModal";
import RentDetailsModal, { TotalPriceResult } from "@/components/rooms/RentDetailsModal";
import TenantDetailsModal from "@/app/components/tenants/TenantDetailsModal";
import BatchBillModal from "@/components/rooms/BatchBillModal";
import { v4 as uuidv4 } from 'uuid';
import { useDormitoryConfig } from "@/lib/hooks/useDormitoryConfig";

interface SortConfig {
  key: 'number' | 'floor' | 'status' | 'roomType' | 'price';
  direction: 'asc' | 'desc';
}

interface Filters {
  floor: string;
  status: string;
  roomType: string;
  priceRange: {
    min: number;
    max: number;
  };
  additionalServices: string[];
}

interface DormitoryResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
    totalFloors: number;
    config?: {
      additionalFees?: {
        airConditioner?: number | null;
        parking?: number | null;
        floorRates?: {
          [key: string]: number | null;
        };
        utilities?: {
          water?: {
            perPerson?: number | null;
          };
          electric?: {
            unit?: number | null;
          };
        };
      };
    };
  };
}

interface RoomConfig {
  roomTypes: Record<string, RoomType>;
  additionalFees: {
    utilities: {
      water: {
        perPerson: number | null;
      };
      electric: {
        unit: number | null;
      };
    };
    items: AdditionalFeeItem[];
    floorRates: Record<string, number | null>;
  };
}

// เพิ่ม interface สำหรับ Modal กรอกค่ามิเตอร์
interface MeterReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  tenant: Tenant | null;
  dormitoryId: string;
  previousReading?: number;
  onSuccess: () => void;
}

// คอมโพเนนต์ Modal สำหรับกรอกค่ามิเตอร์
function MeterReadingModal({ isOpen, onClose, room, tenant, dormitoryId, previousReading = 0, onSuccess }: MeterReadingModalProps) {
  const [currentReading, setCurrentReading] = useState<number>(0);
  const [lastReading, setLastReading] = useState<number>(previousReading);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldMarkAbnormal, setShouldMarkAbnormal] = useState(false);

  useEffect(() => {
    if (previousReading > 0) {
      setLastReading(previousReading);
      setCurrentReading(previousReading);
    }
    
    // ตรวจสอบว่าเป็นห้องว่างหรือไม่ และค่ามิเตอร์เพิ่มขึ้นหรือไม่
    if (!tenant && room?.status === 'available') {
      setShouldMarkAbnormal(true);
    } else {
      setShouldMarkAbnormal(false);
    }
  }, [previousReading, tenant, room?.status]);

  const unitsUsed = Math.max(0, currentReading - lastReading);

  // เพิ่มฟังก์ชันสำหรับโหลดข้อมูลใหม่
  const reloadData = async () => {
    try {
      // เรียกใช้ callback onSuccess ที่ส่งมาจาก parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error reloading data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // บันทึกค่ามิเตอร์ใหม่
      const meterData = {
        roomId: room.id,
        roomNumber: room.number,
        previousReading: lastReading, // ใช้ค่าที่ผู้ใช้อาจแก้ไข
        currentReading,
        unitsUsed,
        readingDate: new Date().toISOString(),
        type: 'electric' as const
      };

      const result = await saveMeterReading(dormitoryId, meterData);

      if (result.success) {
        // ถ้ามีผู้เช่า อัปเดตข้อมูลผู้เช่า
        if (tenant) {
          const electricityUsage = {
            unitsUsed,
            previousReading: lastReading, // ใช้ค่าที่ผู้ใช้อาจแก้ไข
            currentReading,
            charge: 0 // ค่าไฟจะคำนวณจากการตั้งค่าหอพัก
          };

          await updateTenant(dormitoryId, tenant.id, {
            electricityUsage,
            hasMeterReading: true,
            lastMeterReadingDate: new Date().toISOString()
          });
        }
        
        // ถ้าเป็นห้องว่างและค่ามิเตอร์เพิ่มขึ้น เปลี่ยนสถานะเป็น abnormal
        if (shouldMarkAbnormal && unitsUsed > 0) {
          await updateRoom(dormitoryId, room.id, {
            status: 'abnormal'
          });
          toast.success("บันทึกค่ามิเตอร์เรียบร้อยแล้ว และเปลี่ยนสถานะห้องเป็น 'ผิดปกติ' โดยอัตโนมัติ");
        } else {
          toast.success("บันทึกค่ามิเตอร์เรียบร้อยแล้ว");
        }
        
        reloadData();
        onClose();
      } else {
        setError("ไม่สามารถบันทึกค่ามิเตอร์ได้");
      }
    } catch (error) {
      console.error("Error saving meter reading:", error);
      setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">บันทึกค่ามิเตอร์ไฟฟ้า</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">ห้อง: {room.number}</p>
            {tenant ? (
              <p className="text-sm text-gray-600 mb-2">ผู้เช่า: {tenant.name}</p>
            ) : (
              <p className="text-sm text-gray-600 mb-2 text-orange-500 font-medium">ห้องว่าง (ไม่มีผู้เช่า)</p>
            )}
            
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ค่ามิเตอร์ล่าสุด
            </label>
            <input
              type="number"
              step="0.01"
              value={lastReading}
              onChange={(e) => setLastReading(parseFloat(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm mb-4"
              required
            />
            
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ค่ามิเตอร์ปัจจุบัน
            </label>
            <input
              type="number"
              step="0.01"
              value={currentReading}
              onChange={(e) => setCurrentReading(parseFloat(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div className="mb-6 p-3 bg-blue-50 rounded-md">
            <p className="text-sm font-medium text-blue-800">หน่วยที่ใช้: {unitsUsed.toFixed(2)} หน่วย</p>
          </div>

          {shouldMarkAbnormal && unitsUsed > 0 && (
            <div className="mb-4 p-3 bg-orange-50 text-orange-700 rounded-md">
              <p className="text-sm font-medium">
                <span className="font-bold">คำเตือน:</span> ห้องนี้ไม่มีผู้เช่าแต่ค่ามิเตอร์เพิ่มขึ้น ระบบจะเปลี่ยนสถานะห้องเป็น &ldquo;ผิดปกติ&rdquo; โดยอัตโนมัติ
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoomsPageContent({ dormId }: { dormId: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showTenantDetailsModal, setShowTenantDetailsModal] = useState(false);
  const [showRoomDetailsModal, setShowRoomDetailsModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showMeterReadingModal, setShowMeterReadingModal] = useState(false);
  const [showRentDetailsModal, setShowRentDetailsModal] = useState(false);
  const [showBatchBillModal, setShowBatchBillModal] = useState(false);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [meterReading, setMeterReading] = useState<number>(0);
  const [selectedTenantForMeter, setSelectedTenantForMeter] = useState<Tenant | null>(null);
  const [previousReading, setPreviousReading] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'number',
    direction: 'asc'
  });
  const [filters, setFilters] = useState<Filters>({
    floor: '',
    status: '',
    roomType: '',
    priceRange: {
      min: 0,
      max: 0
    },
    additionalServices: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  // ใช้ dormitoryConfig จาก context แทน
  // const [dormitoryConfig, setDormitoryConfig] = useState<DormitoryConfig | null>(null);
  const { config: dormitoryConfig, isLoading: isLoadingConfig, refreshConfig } = useDormitoryConfig();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [dormitoryName, setDormitoryName] = useState("");
  const [lastPaymentDates, setLastPaymentDates] = useState<Record<string, string>>({});

  const router = useRouter();
  const { user } = useAuth();
  const searchParamsHook = useSearchParams();

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredRooms = useMemo(() => {
    console.log("กำลังคำนวณ filteredRooms จากข้อมูลห้องทั้งหมด", rooms.length, "ห้อง");
    
    if (!rooms || rooms.length === 0) {
      console.log("ไม่มีข้อมูลห้องพัก");
      return [];
    }
    
    let result = [...rooms];
    
    // ถ้ามีการค้นหา
    if (searchQuery) {
      console.log("กำลังค้นหาด้วยคำค้น:", searchQuery);
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (room) =>
          room.number.toLowerCase().includes(query) ||
          (room.roomType && room.roomType.toLowerCase().includes(query)) ||
          (room.price && room.price.toString().includes(query))
      );
    }
    
    // กรองตามเงื่อนไขต่างๆ
    if (filters.floor) {
      result = result.filter((room) => room.floor === filters.floor);
    }
    
    if (filters.status) {
      result = result.filter((room) => room.status === filters.status);
    }
    
    if (filters.roomType) {
      result = result.filter((room) => room.roomType === filters.roomType);
    }
    
    if (filters.priceRange.min > 0 || filters.priceRange.max > 0) {
      result = result.filter(
        (room) =>
          (!filters.priceRange.min || (room.price && room.price >= filters.priceRange.min)) &&
          (!filters.priceRange.max || (room.price && room.price <= filters.priceRange.max))
      );
    }
    
    if (filters.additionalServices.length > 0) {
      result = result.filter((room) =>
        filters.additionalServices.every((service) =>
          room.additionalServices?.includes(service)
        )
      );
    }
    
    // เรียงลำดับ
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        if (sortConfig.key === 'number') {
          const numA = parseInt(a.number.replace(/[^0-9]/g, ''));
          const numB = parseInt(b.number.replace(/[^0-9]/g, ''));
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }
        
        if (a[sortConfig.key] === undefined || b[sortConfig.key] === undefined) {
          return 0;
        }
        
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        
        return 0;
      });
    }
    
    console.log("จำนวนห้องพักที่ผ่านการกรอง:", result.length, "ห้อง");
    return result;
  }, [rooms, searchQuery, filters, sortConfig]);

  const sortedAndFilteredRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'number':
          const roomA = parseInt(a.number.replace(/\D/g, '')) || 0;
          const roomB = parseInt(b.number.replace(/\D/g, '')) || 0;
          return (roomA - roomB) * direction;
        case 'floor':
          return (a.floor - b.floor) * direction;
        case 'status':
          return a.status.localeCompare(b.status) * direction;
        case 'roomType': {
          const typeA = roomTypes.find(type => type.id === a.roomType)?.name || '';
          const typeB = roomTypes.find(type => type.id === b.roomType)?.name || '';
          return typeA.localeCompare(typeB) * direction;
        }
        case 'price': {
          const priceA = calculateTotalPrice(a, dormitoryConfig, tenants.find(t => t.roomNumber === a.number));
          const priceB = calculateTotalPrice(b, dormitoryConfig, tenants.find(t => t.roomNumber === b.number));
          return (priceA.total - priceB.total) * direction;
        }
        default:
          return 0;
      }
    });
  }, [filteredRooms, sortConfig, roomTypes, dormitoryConfig, tenants]);

  // ฟังก์ชันโหลดข้อมูลห้องพัก
  const loadRooms = async () => {
    if (!dormId) return;
    
    try {
      setIsLoading(true);
      console.log("เริ่มโหลดข้อมูลห้องพัก สำหรับ dormId:", dormId);
      
      const result = await getRooms(dormId);
      console.log("ผลลัพธ์การโหลดห้องพัก:", result);
      
      if (result.success && result.data) {
        console.log("โหลดข้อมูลห้องพักสำเร็จ จำนวน", result.data.length, "ห้อง");
        setRooms(result.data);
      } else {
        console.error("ไม่สามารถโหลดข้อมูลห้องพักได้:", result.error);
        setError("ไม่สามารถโหลดข้อมูลห้องพักได้");
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลห้องพัก:", error);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูลห้องพัก");
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันโหลดข้อมูลผู้เช่า
  const loadTenants = async () => {
    if (!dormId) return;
    
    try {
      console.log("เริ่มโหลดข้อมูลผู้เช่า");
      const result = await queryTenants(dormId);
      console.log("ผลลัพธ์การโหลดข้อมูลผู้เช่า:", result);
      
      if (result.success && result.data) {
        console.log("โหลดข้อมูลผู้เช่าสำเร็จ จำนวน", result.data.length, "คน");
        setTenants(result.data);
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า:", error);
    }
  };

  // ฟังก์ชันโหลดข้อมูลประเภทห้อง
  const loadRoomTypes = async () => {
    if (!dormId) return;
    
    try {
      console.log("เริ่มโหลดข้อมูลประเภทห้อง");
      const result = await getRoomTypes(dormId);
      console.log("ผลลัพธ์การโหลดข้อมูลประเภทห้อง:", result);
      
      if (result.success && result.data) {
        console.log("โหลดข้อมูลประเภทห้องสำเร็จ จำนวน", result.data.length, "ประเภท");
        setRoomTypes(result.data);
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลประเภทห้อง:", error);
    }
  };

  // เพิ่ม useEffect เพื่อโหลดข้อมูลเมื่อหน้าเว็บโหลดเสร็จ
  useEffect(() => {
    console.log("useEffect ทำงาน, dormId:", dormId);
    if (dormId) {
      loadRooms();
      loadRoomTypes();
      loadTenants();
    }
  }, [dormId]);

  // เรียกใช้ refreshConfig เมื่อค่า dormId เปลี่ยน
  useEffect(() => {
    if (dormId) {
      refreshConfig(dormId);
    }
  }, [dormId, refreshConfig]);

  // อัพเดท search query เมื่อ URL parameter เปลี่ยน
  useEffect(() => {
    setSearchQuery(searchParamsHook.get('search') || '');
  }, [searchParamsHook]);

  const handleAddRoom = (newRoom: Room) => {
    setRooms((prevRooms) => [...prevRooms, newRoom]);
    router.refresh();
    setShowAddRoomModal(false);
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setShowEditRoomModal(true);
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms((prev) =>
      prev.map((room) => (room.id === updatedRoom.id ? updatedRoom : room))
    );
    setSelectedRoom(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบห้องนี้?")) {
      return;
    }

    try {
      const result = await deleteRoom(dormId, roomId);
      if (result.success) {
        // รีโหลดข้อมูลห้องพักจากฐานข้อมูล
        const roomsResult = await getRooms(dormId);
        if (roomsResult.success && roomsResult.data) {
          setRooms(roomsResult.data);
        }
        toast.success("ลบห้องพักเรียบร้อยแล้ว");
      } else {
        console.error("Error from deleteRoom:", result.error);
        toast.error(result.error instanceof Error 
          ? `เกิดข้อผิดพลาด: ${result.error.message}` 
          : typeof result.error === 'string' 
            ? result.error 
            : "เกิดข้อผิดพลาดในการลบห้องพัก");
        
        // รีโหลดข้อมูลห้องพักเมื่อเกิด error เพื่อให้ข้อมูลตรงกับฐานข้อมูล
        const reloadData = async () => {
          setIsLoading(true);
          try {
            const [roomsResult, roomTypesResult, dormResult, tenantsResult, billsResult] =
              await Promise.all([
                getRooms(dormId),
                getRoomTypes(dormId),
                getDormitory(dormId),
                queryTenants(dormId),
                getBillsByDormitory(dormId),
              ]);

            if (roomsResult.success && roomsResult.data) {
              setRooms(roomsResult.data);
            }

            if (roomTypesResult.success && roomTypesResult.data) {
              setRoomTypes(roomTypesResult.data);
            }

            if (dormResult.success && dormResult.data) {
              setDormitoryName(dormResult.data.name);
            }

            if (tenantsResult.success && tenantsResult.data) {
              // อัพเดทสถานะของผู้เช่าตามข้อมูลบิลล่าสุด
              if (billsResult.success && billsResult.data) {
                const updatedTenants = tenantsResult.data.map(tenant => {
                  // กรองบิลที่เกี่ยวข้องกับผู้เช่านี้และยังไม่ชำระเงิน
                  const tenantBills = billsResult.data.filter(
                    (bill: any) => bill.tenantId === tenant.id && 
                    (bill.status === 'pending' || bill.status === 'partially_paid' || bill.status === 'overdue')
                  );
                  
                  // คำนวณยอดค้างชำระทั้งหมด
                  const outstandingBalance = tenantBills.reduce(
                    (total: number, bill: any) => total + (bill.remainingAmount || 0), 
                    0
                  );
                  
                  // อัพเดทข้อมูลผู้เช่า
                  return {
                    ...tenant,
                    outstandingBalance: outstandingBalance
                  };
                });
                
                setTenants(updatedTenants);
              } else {
              setTenants(tenantsResult.data);
              }
            }
          } catch (error) {
            console.error("Error reloading data:", error);
          } finally {
            setIsLoading(false);
          }
        };
        
        reloadData();
      }
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("ไม่สามารถลบห้องพักได้");
      
      // รีโหลดข้อมูลห้องพัก
      const reloadData = async () => {
        setIsLoading(true);
        try {
          const roomsResult = await getRooms(dormId);
          if (roomsResult.success && roomsResult.data) {
            setRooms(roomsResult.data);
          }
        } catch (error) {
          console.error("Error reloading rooms:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      reloadData();
    }
  };

  const getStatusText = (status: Room["status"], tenant?: Tenant) => {
    // null check สำหรับ status
    if (!status) return 'ไม่ระบุ';
    
    if (tenant) {
      // ถ้ามีผู้เช่า
      if (status === 'maintenance') {
        return 'ปิดซ่อม';
      } else if (status === 'abnormal') {
        return 'ผิดปกติ';
      } else if (status === 'pending_bill') {
        return 'รอวางบิล';
      } else if (status === 'billed') {
        return 'รอชำระเงิน';
      } else {
        return 'มีผู้เช่า';
      }
    } else {
      // ถ้าไม่มีผู้เช่า
      if (status === 'occupied') {
        return 'ว่าง (ยังไม่มีผู้เช่า)';
      } else if (status === 'available') {
        return 'ว่าง';
      } else if (status === 'maintenance') {
        return 'ปิดซ่อม';
      } else if (status === 'abnormal') {
        return 'ผิดปกติ';
      } else if (status === 'reserved') {
        return 'จอง';
      } else {
        return 'ไม่ระบุ';
      }
    }
  };

  const getStatusColor = (status: Room["status"], tenant?: Tenant) => {
    // null check สำหรับ status
    if (!status) return 'bg-gray-300';

    // ถ้ามีผู้เช่าและยอดค้างชำระ
    if (tenant && tenant.outstandingBalance > 0) {
      return 'bg-red-500';
    }
    
    switch (status) {
      case "available":
        return "bg-green-500";
      case "occupied":
        return "bg-blue-500";
      case "maintenance":
        return "bg-orange-400";
      case "abnormal":
        return "bg-red-500";
      case "ready_for_billing":
        return "bg-purple-500";
      case "pending_payment":
        // เช็คว่ามีการชำระเงินบางส่วนหรือไม่
        if (tenant && tenant.outstandingBalance > 0 && tenant.lastPaymentDate) {
          return "bg-amber-500"; // ชำระบางส่วน
        }
        return "bg-yellow-500"; // รอชำระ
      default:
        return "bg-gray-300"; // default
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allRoomIds = sortedAndFilteredRooms.map(room => room.id);
      setSelectedRooms(allRoomIds);
    } else {
      setSelectedRooms([]);
    }
  };

  const handleSelectRoom = (roomId: string, checked: boolean) => {
    if (checked) {
      setSelectedRooms(prev => [...prev, roomId]);
    } else {
      setSelectedRooms(prev => prev.filter(id => id !== roomId));
    }
  };

  const handleDeleteSelectedRooms = async () => {
    if (!selectedRooms.length) return;

    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบห้องพักที่เลือกทั้งหมด ${selectedRooms.length} ห้อง?`)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      let errorMessages: string[] = [];

      for (const roomId of selectedRooms) {
        try {
          const result = await deleteRoom(dormId, roomId);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            const errorMsg = result.error instanceof Error 
              ? result.error.message 
              : typeof result.error === 'string' 
                ? result.error 
                : `ไม่สามารถลบห้อง ${roomId} ได้`;
            errorMessages.push(errorMsg);
            console.error(`Error deleting room ${roomId}:`, result.error);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error deleting room ${roomId}:`, error);
        }
      }

      if (successCount > 0) {
        // รีโหลดข้อมูลห้องพัก
        const roomsResult = await getRooms(dormId);
        if (roomsResult.success && roomsResult.data) {
          setRooms(roomsResult.data);
        }
        setSelectedRooms([]);
        toast.success(`ลบห้องพักสำเร็จ ${successCount} ห้อง${errorCount > 0 ? `, ไม่สำเร็จ ${errorCount} ห้อง` : ''}`);
        
        if (errorMessages.length > 0) {
          console.error('Error messages:', errorMessages);
          // แสดงข้อความ error ไม่เกิน 3 ข้อความแรก
          errorMessages.slice(0, 3).forEach(msg => {
            toast.error(msg);
          });
          if (errorMessages.length > 3) {
            toast.error(`และอีก ${errorMessages.length - 3} ข้อความ`);
          }
        }
      } else {
        toast.error('ไม่สามารถลบห้องพักได้');
        if (errorMessages.length > 0) {
          // แสดงข้อความ error ไม่เกิน 3 ข้อความแรก
          errorMessages.slice(0, 3).forEach(msg => {
            toast.error(msg);
          });
        }
      }
    } catch (error) {
      console.error('Error deleting rooms:', error);
      toast.error('เกิดข้อผิดพลาดในการลบห้องพัก');
    }
  };

  const handleRoomClick = useCallback((room: Room) => {
    // ปิดโมดาลอื่นๆ ก่อนเปิดโมดาลใหม่
    setShowMeterReadingModal(false);
    setShowRentDetailsModal(false);
    setShowTenantDetailsModal(false);
    setShowAddTenantModal(false);
    
    setSelectedRoom(room);
    setShowRoomDetailsModal(true);
  }, []);

  const handleAddTenant = useCallback((room: Room) => {
    // ปิดโมดาลอื่นๆ ก่อนเปิดโมดาลใหม่
    setShowRoomDetailsModal(false);
    setShowMeterReadingModal(false);
    setShowRentDetailsModal(false);
    setShowTenantDetailsModal(false);
    
    setSelectedRoom(room);
    setShowAddTenantModal(true);
  }, []);

  const handleTenantClick = useCallback((tenant: Tenant) => {
    if (!tenant || !tenant.id) {
      toast.error("ไม่พบข้อมูลผู้เช่า");
      return;
    }
    
    // ปิดโมดาลอื่นๆ ก่อนเปิดโมดาลใหม่
    setShowRoomDetailsModal(false);
    setShowMeterReadingModal(false);
    setShowRentDetailsModal(false);
    setShowAddTenantModal(false);
    
    setSelectedTenant(tenant);
    setShowTenantDetailsModal(true);
  }, []);

  const handleRentDetailsClick = useCallback((room: Room) => {
    // ปิดโมดาลอื่นๆ ก่อนเปิดโมดาลใหม่
    setShowRoomDetailsModal(false);
    setShowMeterReadingModal(false);
    setShowTenantDetailsModal(false);
    setShowAddTenantModal(false);
    
    setSelectedRoom(room);
    setShowRentDetailsModal(true);
  }, []);

  const handleTenantAdded = async () => {
    setShowAddTenantModal(false);
    
    try {
      // ถ้าห้องมีสถานะเป็น "abnormal" ให้เปลี่ยนเป็น "occupied"
      if (selectedRoom && selectedRoom.status === 'abnormal') {
        await updateRoom(dormId, selectedRoom.id, {
          status: 'occupied'
        });
        toast.success("เปลี่ยนสถานะห้องจาก 'ผิดปกติ' เป็น 'มีผู้เช่า' เรียบร้อยแล้ว");
      }
      
      toast.success("เพิ่มผู้เช่าเรียบร้อยแล้ว");
      loadRooms();
      // รีเซ็ตตัวแปร
      setSelectedRoom(null);
    } catch (error) {
      console.error("Error updating room status:", error);
      toast.error("เกิดข้อผิดพลาดในการอัพเดทสถานะห้อง");
    } finally {
      // โหลดข้อมูลห้องใหม่
      console.log("Reloading rooms data");
      loadRooms();
    }
  };

  // ฟังก์ชันสำหรับจัดการการชำระเงิน
  const handlePayment = async (paymentData: {
    amount: number;
    method: string;
    date: Date;
    notes?: string;
    slipUrl?: string;
  }) => {
    console.log("handlePayment called with:", paymentData);
    
    if (!selectedBill || !selectedRoom || !selectedTenant) {
      console.error("Missing required data for payment:", { 
        selectedBill, 
        selectedRoom, 
        selectedTenant 
      });
      toast.error("ข้อมูลไม่ครบถ้วนสำหรับการชำระเงิน");
      return;
    }
    
    try {
      setIsProcessingPayment(true);
      
      console.log("Recording payment for bill:", selectedBill);
      
      // เรียกใช้ฟังก์ชัน recordPayment จาก lib/firebase/paymentUtils.ts
      const result = await recordPayment(dormId, selectedBill.id, {
        amount: paymentData.amount,
        method: paymentData.method,
        date: paymentData.date,
        notes: paymentData.notes,
        slipUrl: paymentData.slipUrl,
        tenantId: selectedTenant.id,
        recordedBy: "Admin" // ใช้ค่าคงที่แทน user?.displayName
      });
      
      if (result.success) {
        console.log("Payment recorded successfully:", result.data);
        
        // อัพเดทวันที่ชำระเงินล่าสุดและยอดค้างชำระของผู้เช่า
        if (selectedTenant) {
          try {
            const updatedTenant = {
              ...selectedTenant,
              lastPaymentDate: paymentData.date.toISOString(),
              outstandingBalance: selectedBill.totalAmount - (selectedBill.paidAmount + paymentData.amount) > 0 
                ? selectedBill.totalAmount - (selectedBill.paidAmount + paymentData.amount) 
                : 0,
              // รีเซ็ตค่าการใช้ไฟฟ้าเป็น 0 หลังจากชำระเงินเรียบร้อยแล้ว
              electricityUsage: selectedTenant.electricityUsage ? {
                ...selectedTenant.electricityUsage,
                unitsUsed: 0
              } : undefined
            };
            
            console.log("Updating tenant's payment info:", updatedTenant);
            
            const updateTenantResult = await updateTenant(dormId, selectedTenant.id, updatedTenant);
            if (!updateTenantResult.success) {
              console.error("Failed to update tenant:", updateTenantResult.error);
            } else {
              console.log("Tenant updated successfully");
              
              // อัพเดทข้อมูลผู้เช่าในสถานะ
              setTenants(prevTenants => 
                prevTenants.map(t => 
                  t.id === selectedTenant.id ? updatedTenant : t
                )
              );
            }
          } catch (error) {
            console.error("Error updating tenant:", error);
          }
        }
        
        // อัพเดทสถานะห้องตามสถานะการชำระเงิน
        if (selectedRoom) {
          try {
            let newRoomStatus: Room['status'] = selectedRoom.status;
            
            if (result.data?.billStatus === 'paid') {
              // ถ้าชำระเงินครบแล้ว ให้เปลี่ยนสถานะเป็น occupied
              newRoomStatus = 'occupied';
            } else if (result.data?.billStatus === 'partially_paid') {
              // ถ้าชำระเงินบางส่วน ให้คงสถานะ pending_payment
              newRoomStatus = 'pending_payment';
            }
            
            const roomToUpdate = {
              ...selectedRoom,
              status: newRoomStatus,
              updatedAt: paymentData.date.toISOString(),
            };
            
            console.log(`Updating room status to ${newRoomStatus}:`, roomToUpdate);
            
            const updateRoomResult = await updateRoom(dormId, selectedRoom.id, roomToUpdate);
            if (!updateRoomResult.success) {
              console.error("Failed to update room status:", updateRoomResult.error);
            } else {
              console.log(`Room status updated to ${newRoomStatus}`);
              
              // อัพเดทข้อมูลห้องในสถานะ
              setRooms(prevRooms => 
                prevRooms.map(r => 
                  r.id === selectedRoom.id ? { ...r, status: newRoomStatus } : r
                )
              );
            }
          } catch (error) {
            console.error("Error updating room status:", error);
          }
        }
        
        toast.success("บันทึกการชำระเงินเรียบร้อยแล้ว");
        
        // โหลดข้อมูลห้องใหม่
        loadRooms();
      } else {
        console.error("Failed to record payment:", result.error);
        toast.error(`ไม่สามารถบันทึกการชำระเงินได้: ${result.error}`);
      }
    } catch (error) {
      console.error("Error in handlePayment:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกการชำระเงิน");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  

  // เพิ่มฟังก์ชันสำหรับการออกบิล
  const handleCreateBill = useCallback((room: Room, tenant: Tenant | undefined) => {
    if (!tenant) {
      toast.error("ไม่สามารถออกบิลได้: ไม่มีผู้เช่า");
      return;
    }
    
    if (!tenant.hasMeterReading) {
      toast.error("ไม่สามารถออกบิลได้: ยังไม่ได้จดมิเตอร์");
      return;
    }
    
    if (tenant.electricityUsage && tenant.electricityUsage.unitsUsed === 0) {
      toast.error("ไม่สามารถออกบิลได้: ค่าไฟล่าสุดเป็น 0 กรุณาตรวจสอบการจดมิเตอร์");
      return;
    }
    
    // เปิด RentDetailsModal แทนที่จะนำทางไปยังหน้าสร้างบิล
    setSelectedRooms([room.id]);
    setShowRentDetailsModal(true);
  }, []);

  // เพิ่มฟังก์ชันสำหรับการออกบิลหลายรายการ
  const handleBatchCreateBill = () => {
    // ตรวจสอบว่ามีห้องที่เลือกหรือไม่
    if (selectedRooms.length === 0) {
      toast.error("กรุณาเลือกห้องอย่างน้อย 1 ห้อง");
      return;
    }
    
    // กรองเฉพาะห้องที่พร้อมออกบิล
    const readyRoomIds = selectedRooms
      .filter(roomId => {
        const room = rooms.find(r => r.id === roomId);
        const tenant = room ? tenants.find(t => t.roomNumber === room.number) : undefined;
        return room && (room.status === 'ready_for_billing' || isRoomReadyForBilling(room, tenant));
      });
    
    if (readyRoomIds.length === 0) {
      toast.error("ไม่มีห้องที่พร้อมออกบิล กรุณาเลือกห้องที่มีสถานะ 'พร้อมออกบิล'");
      return;
    }
    
    // แปลง roomIds เป็น Room objects
    const readyRooms = readyRoomIds
      .map(roomId => rooms.find(room => room.id === roomId))
      .filter((room): room is Room => room !== undefined);
    
    // เปิด BatchBillModal แทนที่จะนำทางไปยังหน้าสร้างบิล
    setShowBatchBillModal(true);
  };

  // เพิ่มฟังก์ชัน updateRoomToReadyForBilling ที่หายไป
  const updateRoomToReadyForBilling = async (room: Room) => {
    try {
      console.log("Updating room to ready_for_billing:", room.number);
      const result = await updateRoom(dormId, room.id, {
        ...room,
        status: 'ready_for_billing'
      });
      
      if (result.success) {
        console.log("Room updated successfully:", room.number);
        toast.success(`ห้อง ${room.number} พร้อมออกบิลแล้ว`);
        // อัพเดทข้อมูลห้องในสเตท
        setRooms(prevRooms => 
          prevRooms.map(r => 
            r.id === room.id ? { ...r, status: 'ready_for_billing' } : r
          )
        );
      } else {
        console.error("Failed to update room:", result.error);
        toast.error(`ไม่สามารถอัพเดทสถานะห้อง ${room.number}: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating room status:", error);
      toast.error(`เกิดข้อผิดพลาดในการอัพเดทสถานะห้อง ${room.number}`);
    }
  };

  // ฟังก์ชันแสดงวันที่ในรูปแบบไทย
  const formatThaiDate = (dateString: string) => {
    if (!dateString) return "-";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // เพิ่มฟังก์ชันสำหรับตรวจสอบว่าห้องพร้อมออกบิลหรือไม่
  const isRoomReadyForBilling = (room: Room, tenant: Tenant | undefined) => {
    // ต้องมีผู้เช่า
    if (!tenant) {
      return false;
    }
    
    // ตรวจสอบว่ามีการจดมิเตอร์หรือไม่
    if (!tenant.hasMeterReading) {
      return false;
    }
    
    // ตรวจสอบว่าค่ามิเตอร์ไฟล่าสุดไม่เป็น 0
    if (!tenant.electricityUsage || tenant.electricityUsage.unitsUsed === 0) {
      return false;
    }
    
    // ตรวจสอบว่าห้องมีสถานะที่เหมาะสม
    const hasValidStatus = room.status === 'occupied' || room.status === 'ready_for_billing';
    if (!hasValidStatus) {
      return false;
    }
    
    // ตรวจสอบว่าห้องได้ชำระเงินในรอบบิลล่าสุดหรือไม่
    if (tenant.lastPaymentDate) {
      const lastPayment = new Date(tenant.lastPaymentDate);
      const today = new Date();
      
      // ถ้าชำระเงินในเดือนปัจจุบัน ยังไม่พร้อมออกบิลใหม่
      if (lastPayment.getMonth() === today.getMonth() && 
          lastPayment.getFullYear() === today.getFullYear()) {
        return false;
      }
    }
    
    return true;
  };

  // เพิ่ม useMemo สำหรับคำนวณราคาทั้งหมดของแต่ละห้อง
  const roomPriceDetails = useMemo(() => {
    if (!rooms || !dormitoryConfig) return {};
    
    const priceMap: Record<string, { total: number, breakdown: any }> = {};
    
    rooms.forEach(room => {
      const tenant = tenants.find(t => t.roomNumber === room.number);
      priceMap[room.id] = calculateTotalPrice(room, dormitoryConfig, tenant);
    });
    
    return priceMap;
  }, [rooms, dormitoryConfig, tenants]);

  // เพิ่มฟังก์ชันสำหรับเปิด Modal กรอกค่ามิเตอร์
  const handleMeterReading = useCallback(async (room: Room, tenant?: Tenant) => {
    if (!room || !dormId) return;

    try {
      // ดึงค่ามิเตอร์ล่าสุด
      const result = await getLatestMeterReading(dormId, room.id, 'electric');
      let newPreviousReading = 0;

      if (result.success && result.data && 'currentReading' in result.data) {
        newPreviousReading = (result.data as { currentReading: number }).currentReading;
      }

      // ปิดโมดาลอื่นๆ ก่อนเปิดโมดาลใหม่
      setShowRoomDetailsModal(false);
      setShowRentDetailsModal(false);
      setShowTenantDetailsModal(false);
      setShowAddTenantModal(false);
      
      // เปิด Modal บันทึกค่ามิเตอร์
      setSelectedRoom(room);
      setSelectedTenantForMeter(tenant || null);
      setMeterReading(newPreviousReading);
      setPreviousReading(newPreviousReading);
      setShowMeterReadingModal(true);
    } catch (error) {
      console.error("Error preparing meter reading:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลมิเตอร์ล่าสุด");
    }
  }, [dormId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (roomTypes.length === 0) {
    return (
      <div className="p-6">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dormitories"
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              กลับ
            </Link>
          </div>
          <div className="bg-white rounded-lg p-8 text-center max-w-lg mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีรูปแบบห้องพัก</h3>
            <p className="text-sm text-gray-500 mb-6">
              คุณจำเป็นต้องเพิ่มรูปแบบห้องพักอย่างน้อย 1 รูปแบบก่อนที่จะสามารถเพิ่มห้องพักได้
            </p>
            <Link
              href={`/dormitories/${dormId}/config`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ไปที่หน้าตั้งค่าหอพัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center space-x-4">
          <Link
            href="/dormitories"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span>ย้อนกลับ</span>
          </Link>
          <h1 className="text-2xl font-bold">หอพัก: {dormitoryName}</h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mt-4">
          <nav className="-mb-px flex space-x-8">
            <Link
              href={`/dormitories/${dormId}/rooms`}
              className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              aria-current="page"
            >
              จัดการห้องพัก
            </Link>
            <Link
              href={`/dormitories/${dormId}/tenants`}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              จัดการผู้เช่า
            </Link>
            <Link
              href={`/dormitories/${dormId}/bills`}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              จัดการบิล
            </Link>
          </nav>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-6 mb-6">
        <h2 className="text-xl font-semibold">รายการห้องพัก</h2>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setIsLoading(true);
              const reloadData = async () => {
                try {
                  const [roomsResult, roomTypesResult, dormResult, tenantsResult, billsResult] =
                    await Promise.all([
                      getRooms(dormId),
                      getRoomTypes(dormId),
                      getDormitory(dormId),
                      queryTenants(dormId),
                      getBillsByDormitory(dormId),
                    ]);

                  if (roomsResult.success && roomsResult.data) {
                    setRooms(roomsResult.data);
                  }

                  if (roomTypesResult.success && roomTypesResult.data) {
                    setRoomTypes(roomTypesResult.data);
                  }

                  if (dormResult.success && dormResult.data) {
                    setDormitoryName(dormResult.data.name);
                  }

                  if (tenantsResult.success && tenantsResult.data) {
                    // อัพเดทสถานะของผู้เช่าตามข้อมูลบิลล่าสุด
                    if (billsResult.success && billsResult.data) {
                      const updatedTenants = tenantsResult.data.map(tenant => {
                        // กรองบิลที่เกี่ยวข้องกับผู้เช่านี้และยังไม่ชำระเงิน
                        const tenantBills = billsResult.data.filter(
                          (bill: any) => bill.tenantId === tenant.id && 
                          (bill.status === 'pending' || bill.status === 'partially_paid' || bill.status === 'overdue')
                        );
                        
                        // คำนวณยอดค้างชำระทั้งหมด
                        const outstandingBalance = tenantBills.reduce(
                          (total: number, bill: any) => total + (bill.remainingAmount || 0), 
                          0
                        );
                        
                        // อัพเดทข้อมูลผู้เช่า
                        return {
                          ...tenant,
                          outstandingBalance: outstandingBalance
                        };
                      });
                      
                      setTenants(updatedTenants);
                    } else {
                    setTenants(tenantsResult.data);
                    }
                  }
                  
                  toast.success("รีเฟรชข้อมูลเรียบร้อยแล้ว");
                } catch (error) {
                  console.error("Error reloading data:", error);
                  toast.error("ไม่สามารถรีเฟรชข้อมูลได้");
                } finally {
                  setIsLoading(false);
                }
              };
              
              reloadData();
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            รีเฟรชข้อมูล
          </button>
          <Link
            href={`/dormitories/${dormId}/config`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            จัดการประเภทห้อง
          </Link>
          <button
            onClick={() => setShowAddRoomModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            เพิ่มห้องพัก
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="ค้นหาห้องพัก..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <select
                value={filters.floor}
                onChange={(e) => setFilters({ ...filters, floor: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">ทุกชั้น</option>
                {Array.from(new Set(rooms.map((room) => room.floor))).sort().map((floor) => (
                  <option key={floor} value={floor}>
                    ชั้น {floor}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">ทุกสถานะ</option>
                <option value="available">ว่าง</option>
                <option value="occupied">มีผู้เช่า</option>
                <option value="maintenance">ปรับปรุง</option>
                <option value="abnormal">ผิดปกติ</option>
                <option value="ready_for_billing">รอออกบิล</option>
                <option value="pending_payment">รอชำระเงิน</option>
              </select>
              <select
                value={filters.roomType}
                onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">ทุกประเภท</option>
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedRooms.length > 0 && (
            <div className="mt-4 flex justify-end gap-2">
              {selectedRooms.some(roomId => {
                const room = rooms.find(r => r.id === roomId);
                const tenant = room ? tenants.find(t => t.roomNumber === room.number) : undefined;
                return room && (room.status === 'ready_for_billing' || isRoomReadyForBilling(room, tenant));
              }) && (
                <button
                  onClick={handleBatchCreateBill}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  ออกบิลรายการที่เลือก ({selectedRooms.filter(roomId => {
                    const room = rooms.find(r => r.id === roomId);
                    const tenant = room ? tenants.find(t => t.roomNumber === room.number) : undefined;
                    return room && (room.status === 'ready_for_billing' || isRoomReadyForBilling(room, tenant));
                  }).length})
                </button>
              )}
              <button
                onClick={handleDeleteSelectedRooms}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                ลบห้องที่เลือก ({selectedRooms.length})
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-100 text-gray-700 text-sm">
              <tr>
                <th className="py-2 px-3 text-center font-medium w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedRooms.length === sortedAndFilteredRooms.length && sortedAndFilteredRooms.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </th>
                <th className="py-2 px-3 text-left font-medium">
                  <span onClick={() => handleSort('number')} className="cursor-pointer flex items-center">
                    เลขห้อง{' '}
                    {sortConfig.key === 'number' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </span>
                </th>
                <th className="py-2 px-3 text-left font-medium">
                  <span onClick={() => handleSort('floor')} className="cursor-pointer flex items-center">
                    ชั้น{' '}
                    {sortConfig.key === 'floor' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </span>
                </th>
                <th className="py-2 px-3 text-left font-medium">
                  <span onClick={() => handleSort('status')} className="cursor-pointer flex items-center">
                    ประเภทห้อง{' '}
                    {sortConfig.key === 'roomType' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </span>
                </th>
                <th className="py-2 px-3 text-center font-medium whitespace-nowrap min-w-32">
                  จำนวนผู้พักอาศัย
                </th>
                <th className="py-2 px-3 text-left font-medium">
                  ค่าไฟฟ้า
                </th>
                <th className="py-2 px-3 text-right font-medium">
                  <span onClick={() => handleSort('price')} className="cursor-pointer flex items-center justify-end">
                    ค่าเช่ารวม{' '}
                    {sortConfig.key === 'price' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </span>
                </th>
                <th className="py-2 px-3 text-right font-medium">
                  ยอดค้างชำระ
                </th>
                <th className="py-2 px-3 text-center font-medium">
                  สถานะ
                </th>
                <th className="py-2 px-3 text-center font-medium">
                  วันที่ชำระล่าสุด
                </th>
                <th className="py-2 px-3 text-center font-medium">
                  ผู้เช่า
                </th>
                <th className="py-2 px-3 text-right font-medium">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedAndFilteredRooms.map((room) => {
                const tenant = tenants.find(t => t.roomNumber === room.number);
                // ตรวจสอบว่า dormitoryConfig ไม่เป็น null ก่อนเรียกใช้ calculateTotalPrice
                const priceDetails = dormitoryConfig ? calculateTotalPrice(room, dormitoryConfig, tenant) : {
                  total: 0, 
                  breakdown: {
                    basePrice: 0,
                    floorRate: 0,
                    additionalServices: 0,
                    specialItems: 0,
                    water: 0,
                    electricity: 0
                  }
                };

                return (
                  <tr key={room.id} className={`hover:bg-gray-50 cursor-pointer`}>
                    <td className="px-2 py-4 whitespace-nowrap text-center" onClick={(e) => { e.stopPropagation(); }}>
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(room.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRoom(room.id, e.target.checked);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRoomClick(room);
                        }}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {room.number.padStart(3, '0')}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {room.floor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {roomTypes.find(type => type.id === room.roomType)?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {tenant?.numberOfResidents || '-'} {tenant?.numberOfResidents ? 'คน' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant?.electricityUsage ? (
                        <div className="flex items-center">
                          <span>
                            {tenant.electricityUsage.unitsUsed > 0 ? 
                              `${tenant.electricityUsage.unitsUsed.toFixed(2)} หน่วย (${tenant.electricityUsage.previousReading} → ${tenant.electricityUsage.currentReading})` : 
                              "0 หน่วย (รอจดมิเตอร์ใหม่)"
                            }
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMeterReading(room, tenant);
                            }}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                            title="บันทึกค่ามิเตอร์ใหม่"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      ) : room.status === 'occupied' && tenant ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMeterReading(room, tenant);
                          }}
                          className="inline-flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          <span>บันทึกค่ามิเตอร์</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMeterReading(room, undefined);
                          }}
                          className="inline-flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          <span>บันทึกค่ามิเตอร์</span>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRentDetailsClick(room);
                        }}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {roomPriceDetails[room.id]?.total.toLocaleString() || "0"} บาท
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant?.outstandingBalance ? (
                        <span className={tenant.outstandingBalance > 0 ? "text-red-600 font-medium" : "text-gray-500"}>
                          {tenant.outstandingBalance.toLocaleString()} บาท
                        </span>
                      ) : "0 บาท"}
                    </td>
                    <td 
                      className={`px-4 py-2 text-sm ${getStatusColor(room.status, tenant)}`}
                    >
                      {getStatusText(room.status, tenant)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lastPaymentDates[room.number] ? (
                        <span className="text-green-600">{formatThaiDate(lastPaymentDates[room.number])}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTenantClick(tenant);
                          }}
                          className="text-blue-600 hover:text-blue-900 hover:underline"
                        >
                          {tenant.name}
                        </button>
                      ) : (room.status === "available" || room.status === "abnormal") ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddTenant(room);
                          }}
                          className="inline-flex items-center text-blue-600 hover:text-blue-900"
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          เพิ่มผู้เช่า
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {isRoomReadyForBilling(room, tenant) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateBill(room, tenant);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="ออกบิล"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRoom(room);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoom(room.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddRoomModal && (
        <AddRoomModal
          isOpen={showAddRoomModal}
          onClose={() => setShowAddRoomModal(false)}
          dormitoryId={dormId}
          roomTypes={roomTypes}
          onSuccess={handleAddRoom}
          totalFloors={dormitoryConfig?.data?.totalFloors || 1}
        />
      )}

      {selectedRoom && !showRoomDetailsModal && !showMeterReadingModal && !showRentDetailsModal && !showAddTenantModal && (
        <EditRoomModal
          isOpen={false}
          room={selectedRoom}
          roomTypes={roomTypes}
          onClose={() => setSelectedRoom(null)}
          onSuccess={handleUpdateRoom}
          dormitoryId={dormId}
          totalFloors={dormitoryConfig?.data?.totalFloors || 1}
        />
      )}

      {selectedRoom && showRoomDetailsModal && !showMeterReadingModal && !showRentDetailsModal && !showAddTenantModal && (
        <RoomDetailsModal
          isOpen={showRoomDetailsModal}
          onClose={() => {
            setShowRoomDetailsModal(false);
            setSelectedRoom(null);
          }}
          dormitoryId={dormId}
          roomNumber={selectedRoom.number}
          roomTypes={roomTypes || []}
          config={dormitoryConfig}
          currentTenant={tenants.find(t => t.roomNumber === selectedRoom.number)}
        />
      )}

      {showAddTenantModal && selectedRoom && !showMeterReadingModal && !showRoomDetailsModal && !showRentDetailsModal && (
        <AddTenantModal
          isOpen={showAddTenantModal}
          onClose={() => {
            setShowAddTenantModal(false);
            // ไม่รีเซ็ต selectedRoom ที่นี่เพื่อให้สามารถทำงานต่อกับห้องนั้นได้
          }}
          dormitories={[{ id: dormId, name: dormitoryName }] as Dormitory[]}
          onSuccess={handleTenantAdded}
        />
      )}

      {showMeterReadingModal && selectedRoom && selectedTenantForMeter && !showRoomDetailsModal && !showRentDetailsModal && !showAddTenantModal && (
        <MeterReadingModal
          isOpen={showMeterReadingModal}
          onClose={() => {
            setShowMeterReadingModal(false);
            setSelectedTenantForMeter(null);
            setPreviousReading(0);
            // ไม่รีเซ็ต selectedRoom ที่นี่เพื่อให้สามารถกลับมาจัดการห้องเดิมได้
          }}
          room={selectedRoom}
          tenant={selectedTenantForMeter}
          dormitoryId={dormId}
          previousReading={previousReading}
          onSuccess={loadRooms}
        />
      )}

      {selectedRoom && showRentDetailsModal && !showMeterReadingModal && !showRoomDetailsModal && !showAddTenantModal && (
        <RentDetailsModal
          isOpen={showRentDetailsModal}
          onClose={() => {
            setShowRentDetailsModal(false);
            // ไม่รีเซ็ต selectedRoom ที่นี่เพื่อให้สามารถกลับมาจัดการห้องเดิมได้
          }}
          room={selectedRoom}
          tenant={tenants.find(t => t.roomNumber === selectedRoom.number)}
          priceDetails={roomPriceDetails[selectedRoom.id] || {
            total: 0, 
            breakdown: {
              basePrice: 0,
              floorRate: 0,
              additionalServices: 0,
              specialItems: 0,
              water: 0,
              electricity: 0
            }
          }}
          roomTypeName={roomTypes.find(type => type.id === selectedRoom.roomType)?.name || '-'}
        />
      )}

      {/* Modal แสดงรายละเอียดผู้เช่า */}
      {showTenantDetailsModal && selectedTenant && !showMeterReadingModal && !showRoomDetailsModal && !showRentDetailsModal && !showAddTenantModal && (
        <TenantDetailsModal
          isOpen={showTenantDetailsModal}
          onClose={() => {
            setShowTenantDetailsModal(false);
            setSelectedTenant(null);
          }}
          tenantId={selectedTenant.id}
          dormitoryId={dormId}
        />
      )}

      {/* Batch Bill Modal - ไม่ขัดแย้งกับโมดาลอื่น */}
      {showBatchBillModal && (
        <BatchBillModal
          isOpen={showBatchBillModal}
          onClose={() => setShowBatchBillModal(false)}
          dormitoryId={dormId}
          selectedRooms={rooms.filter(room => selectedRooms.includes(room.id))}
          tenants={tenants}
          roomTypes={roomTypes}
          dormitoryConfig={dormitoryConfig as any}
          onSuccess={() => {
            loadRooms();
            setShowBatchBillModal(false);
            setSelectedRooms([]);
            toast.success("สร้างบิลสำเร็จ");
          }}
        />
      )}

      {selectedRoom && showEditRoomModal && !showRoomDetailsModal && !showMeterReadingModal && !showRentDetailsModal && !showAddTenantModal && (
        <EditRoomModal
          isOpen={showEditRoomModal}
          room={selectedRoom}
          roomTypes={roomTypes}
          onClose={() => {
            setShowEditRoomModal(false);
            setSelectedRoom(null);
          }}
          onSuccess={(updatedRoom) => {
            handleUpdateRoom(updatedRoom);
            setShowEditRoomModal(false);
          }}
          dormitoryId={dormId}
          totalFloors={dormitoryConfig?.data?.totalFloors || 1}
        />
      )}
    </div>
  );
}

// เพิ่ม Server Component สำหรับ page
export default function RoomsPage({ params }: { params: { id: string } }) {
  return <RoomsPageContent dormId={params.id} />;
} 