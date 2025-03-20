"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  getTenant, 
  updateTenant, 
  getRooms,
  getDormitory
} from "@/lib/firebase/firebaseUtils";
import { Tenant } from "@/types/tenant";
import { Room, SpecialItem, Dormitory } from "@/types/dormitory";
import { Loader2, Plus, X, ArrowLeft, Save } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

interface FormData {
  name: string;
  idCard: string;
  phone: string;
  email: string;
  lineId: string;
  workplace: string;
  currentAddress: string;
  dormitoryId: string;
  roomId?: string;
  roomNumber: string;
  startDate: string;
  deposit: number;
  numberOfResidents: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  specialItems: SpecialItem[];
}

export default function EditTenantPage({ params }: { params: { id: string; tenantId: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [dormitory, setDormitory] = useState<Dormitory | null>(null);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    idCard: "",
    phone: "",
    email: "",
    lineId: "",
    workplace: "",
    currentAddress: "",
    dormitoryId: params.id,
    roomId: "",
    roomNumber: "",
    startDate: new Date().toISOString().split("T")[0],
    deposit: 0,
    numberOfResidents: 1,
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
    specialItems: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // ดึงข้อมูลผู้เช่า
        const tenantResult = await getTenant(params.id, params.tenantId);
        if (!tenantResult.success || !tenantResult.data) {
          toast.error("ไม่พบข้อมูลผู้เช่า");
          router.push(`/dormitories/${params.id}/tenants`);
          return;
        }
        
        setTenant(tenantResult.data as Tenant);
        
        // ดึงข้อมูลหอพัก
        const dormitoryResult = await getDormitory(params.id);
        if (dormitoryResult.success && dormitoryResult.data) {
          setDormitory(dormitoryResult.data);
        }
        
        // ดึงข้อมูลห้องทั้งหมด
        const roomsResult = await getRooms(params.id);
        if (roomsResult.success && roomsResult.data) {
          const availableRooms = roomsResult.data.filter(room => 
            room.status === 'available' || room.number === tenantResult.data.roomNumber
          );
          const sortedRooms = availableRooms.sort((a, b) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true });
          });
          setAllRooms(sortedRooms);
        }
        
        // ตั้งค่าข้อมูลเริ่มต้นสำหรับฟอร์ม
        const tenantData = tenantResult.data;
        setFormData({
          name: tenantData.name || "",
          idCard: tenantData.idCard || "",
          phone: tenantData.phone || "",
          email: tenantData.email || "",
          lineId: tenantData.lineId || "",
          workplace: tenantData.workplace || "",
          currentAddress: tenantData.currentAddress || "",
          dormitoryId: tenantData.dormitoryId,
          roomId: tenantData.roomId,
          roomNumber: tenantData.roomNumber,
          startDate: tenantData.startDate || new Date().toISOString().split("T")[0],
          deposit: tenantData.deposit || 0,
          numberOfResidents: tenantData.numberOfResidents || 1,
          emergencyContact: {
            name: tenantData.emergencyContact?.name || "",
            relationship: tenantData.emergencyContact?.relationship || "",
            phone: tenantData.emergencyContact?.phone || "",
          },
          specialItems: tenantData.specialItems || [],
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id, params.tenantId, router]);

  const handleAddSpecialItem = () => {
    const newItem: SpecialItem = {
      id: uuidv4(),
      name: "",
      amount: 0,
      duration: 0,
      startDate: new Date().toISOString().split("T")[0],
    };
    setFormData({
      ...formData,
      specialItems: [...formData.specialItems, newItem],
    });
  };

  const handleRemoveSpecialItem = (id: string) => {
    setFormData({
      ...formData,
      specialItems: formData.specialItems.filter(item => item.id !== id),
    });
  };

  const handleSpecialItemChange = (id: string, field: keyof SpecialItem, value: string | number) => {
    setFormData({
      ...formData,
      specialItems: formData.specialItems.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      }),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!formData.name || !formData.phone) {
        toast.error("กรุณากรอกข้อมูลที่จำเป็น");
        setIsSubmitting(false);
        return;
      }

      // อัพเดทข้อมูลผู้เช่า
      const updatedTenant = {
        ...formData,
        specialItems: formData.specialItems.map(item => ({
          ...item,
          remainingBillingCycles: item.duration > 0 ? 
            (item.remainingBillingCycles !== undefined ? item.remainingBillingCycles : item.duration) : 
            undefined
        })),
        updatedAt: new Date().toISOString(),
      };

      const result = await updateTenant(params.id, params.tenantId, updatedTenant);
      
      if (result.success) {
        toast.success("แก้ไขข้อมูลผู้เช่าเรียบร้อยแล้ว");
        router.push(`/dormitories/${params.id}/tenants`);
      } else {
        const errorMessage = typeof result.error === 'string' ? result.error : "เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้เช่า";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้เช่า");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-700">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">ไม่พบข้อมูลผู้เช่า</p>
        <Link href={`/dormitories/${params.id}/tenants`} className="flex items-center text-blue-500 hover:underline">
          <ArrowLeft size={16} className="mr-1" /> กลับไปยังรายการผู้เช่า
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link 
            href={`/dormitories/${params.id}/tenants`}
            className="flex items-center text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft size={20} className="mr-1" />
            <span>กลับไปยังรายการผู้เช่า</span>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 ml-4">แก้ไขข้อมูลผู้เช่า</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* ข้อมูลผู้เช่า */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">ข้อมูลส่วนตัว</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อ-นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เลขบัตรประชาชน
                  </label>
                  <input
                    type="text"
                    value={formData.idCard}
                    onChange={(e) => setFormData({ ...formData, idCard: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Line ID
                  </label>
                  <input
                    type="text"
                    value={formData.lineId}
                    onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ที่ทำงาน
                  </label>
                  <input
                    type="text"
                    value={formData.workplace}
                    onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ที่อยู่ปัจจุบัน
                  </label>
                  <textarea
                    value={formData.currentAddress}
                    onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* ข้อมูลการเช่า */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">ข้อมูลการเช่า</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เลขห้อง <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.roomNumber}
                    onChange={(e) => {
                      const selectedRoom = allRooms.find(room => room.number === e.target.value);
                      setFormData({
                        ...formData,
                        roomNumber: e.target.value,
                        roomId: selectedRoom?.id || ''
                      });
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">เลือกห้อง</option>
                    {allRooms.map((room) => (
                      <option 
                        key={room.id} 
                        value={room.number}
                        disabled={room.status === 'occupied' && room.number !== formData.roomNumber}
                      >
                        {room.number} - ชั้น {room.floor}
                        {room.roomType && ` (${room.roomType})`}
                        {room.status === 'occupied' && room.number !== formData.roomNumber && ' - ไม่ว่าง'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    วันที่เข้าพัก
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เงินประกัน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: parseInt(e.target.value) || 0 })}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    จำนวนผู้พักอาศัย
                  </label>
                  <input
                    type="number"
                    value={formData.numberOfResidents}
                    onChange={(e) => setFormData({ ...formData, numberOfResidents: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* ผู้ติดต่อฉุกเฉิน */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">ผู้ติดต่อฉุกเฉิน</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergencyContact: {
                        ...formData.emergencyContact,
                        name: e.target.value,
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ความสัมพันธ์
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergencyContact: {
                        ...formData.emergencyContact,
                        relationship: e.target.value,
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergencyContact: {
                        ...formData.emergencyContact,
                        phone: e.target.value,
                      },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* รายการพิเศษ */}
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">รายการพิเศษ</h2>
              <div className="space-y-4">
                {formData.specialItems.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-start gap-2 p-3 border rounded-md bg-gray-50">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ชื่อรายการ
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleSpecialItemChange(item.id, "name", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ชื่อรายการ"
                      />
                    </div>
                    <div className="w-[120px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        จำนวนเงิน
                      </label>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleSpecialItemChange(item.id, "amount", parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="จำนวนเงิน"
                      />
                    </div>
                    <div className="w-[120px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        จำนวนงวด
                      </label>
                      <input
                        type="number"
                        value={item.duration}
                        onChange={(e) => handleSpecialItemChange(item.id, "duration", parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="จำนวนงวด (0 = ไม่จำกัด)"
                      />
                    </div>
                    <div className="w-[150px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        วันที่เริ่มต้น
                      </label>
                      <input
                        type="date"
                        value={item.startDate}
                        onChange={(e) => handleSpecialItemChange(item.id, "startDate", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddSpecialItem}
                  className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <Plus size={16} className="mr-1" /> เพิ่มรายการพิเศษ
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link 
              href={`/dormitories/${params.id}/tenants`}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  บันทึกข้อมูล
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 