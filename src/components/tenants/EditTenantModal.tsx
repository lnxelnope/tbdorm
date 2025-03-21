"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { X, Plus } from "lucide-react";
import type { Dormitory, Room, SpecialItem } from '@/types/dormitory';
import type { Tenant } from '@/types/tenant';
import { toast } from "sonner";
import { updateTenant, getRooms } from "@/lib/firebase/firebaseUtils";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { v4 as uuidv4 } from "uuid";

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

interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  dormitories: Dormitory[];
  onSuccess: () => void;
}

export default function EditTenantModal({
  isOpen,
  onClose,
  tenant,
  dormitories,
  onSuccess,
}: EditTenantModalProps) {
  const [workplaces, setWorkplaces] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: tenant.name,
    idCard: tenant.idCard || "",
    phone: tenant.phone || "",
    email: tenant.email || "",
    lineId: tenant.lineId || "",
    workplace: tenant.workplace || "",
    currentAddress: tenant.currentAddress || "",
    dormitoryId: tenant.dormitoryId,
    roomId: tenant.roomId,
    roomNumber: tenant.roomNumber,
    startDate: tenant.startDate,
    deposit: tenant.deposit || 0,
    numberOfResidents: tenant.numberOfResidents || 1,
    emergencyContact: {
      name: tenant.emergencyContact?.name || "",
      relationship: tenant.emergencyContact?.relationship || "",
      phone: tenant.emergencyContact?.phone || "",
    },
    specialItems: tenant.specialItems || [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allRooms, setAllRooms] = useState<Room[]>([]);

  useEffect(() => {
    // อัพเดทข้อมูลในฟอร์มเมื่อ tenant เปลี่ยน
    setFormData({
      name: tenant.name,
      idCard: tenant.idCard || "",
      phone: tenant.phone || "",
      email: tenant.email || "",
      lineId: tenant.lineId || "",
      workplace: tenant.workplace || "",
      currentAddress: tenant.currentAddress || "",
      dormitoryId: tenant.dormitoryId,
      roomId: tenant.roomId,
      roomNumber: tenant.roomNumber,
      startDate: tenant.startDate,
      deposit: tenant.deposit || 0,
      numberOfResidents: tenant.numberOfResidents || 1,
      emergencyContact: {
        name: tenant.emergencyContact?.name || "",
        relationship: tenant.emergencyContact?.relationship || "",
        phone: tenant.emergencyContact?.phone || "",
      },
      specialItems: tenant.specialItems || [],
    });
  }, [tenant]);

  const loadWorkplaces = async () => {
    try {
      const workplacesRef = collection(db, 'workplaces');
      const snapshot = await getDocs(workplacesRef);
      const workplacesList = snapshot.docs.map(doc => doc.data().name);
      setWorkplaces(workplacesList);
    } catch (error) {
      console.error('Error loading workplaces:', error);
    }
  };

  useEffect(() => {
    loadWorkplaces();
  }, []);

  useEffect(() => {
    const loadRooms = async () => {
      if (!formData.dormitoryId) {
        setAllRooms([]);
        return;
      }

      try {
        const result = await getRooms(formData.dormitoryId);
        if (result.success && result.data) {
          const availableRooms = result.data.filter(room => 
            room.status === 'available' || room.number === formData.roomNumber
          );
          const sortedRooms = availableRooms.sort((a, b) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true });
          });
          setAllRooms(sortedRooms);
        } else {
          setAllRooms([]);
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
        toast.error('ไม่สามารถโหลดข้อมูลห้องได้');
        setAllRooms([]);
      }
    };

    loadRooms();
  }, [formData.dormitoryId]);

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
      if (!formData.name || !formData.idCard || !formData.phone) {
        toast.error("กรุณากรอกข้อมูลที่จำเป็น");
        setIsSubmitting(false);
        return;
      }

      // อัพเดทข้อมูลผู้เช่า
      const updatedTenant = {
        ...tenant,
        name: formData.name,
        idCard: formData.idCard,
        phone: formData.phone,
        email: formData.email,
        lineId: formData.lineId,
        workplace: formData.workplace,
        currentAddress: formData.currentAddress,
        numberOfResidents: formData.numberOfResidents,
        deposit: formData.deposit,
        emergencyContact: formData.emergencyContact,
        specialItems: formData.specialItems.map(item => ({
          ...item,
          remainingBillingCycles: item.duration > 0 ? 
            (item.remainingBillingCycles !== undefined ? item.remainingBillingCycles : item.duration) : 
            undefined
        })),
        updatedAt: new Date().toISOString(),
      };

      console.log('Submitting form data:', formData);
      const result = await updateTenant(tenant.dormitoryId, tenant.id, formData);
      console.log('Update tenant result:', result);
      
      if (result.success) {
        toast.success("แก้ไขข้อมูลผู้เช่าเรียบร้อยแล้ว");
        onSuccess();
        onClose();
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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-xl bg-white flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <Dialog.Title className="text-lg font-semibold">
              แก้ไขข้อมูลผู้เช่า
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* ข้อมูลผู้เช่า */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">ข้อมูลผู้เช่า</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เลขบัตรประชาชน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.idCard}
                      readOnly
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-not-allowed"
                      title="ไม่สามารถแก้ไขเลขบัตรประชาชนได้"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Line ID <span className="text-gray-500">(ไม่จำเป็น)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lineId}
                      onChange={(e) =>
                        setFormData({ ...formData, lineId: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ที่ทำงาน <span className="text-gray-500">(ไม่จำเป็น)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.workplace}
                      onChange={(e) =>
                        setFormData({ ...formData, workplace: e.target.value })
                      }
                      list="workplaces"
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder="กรอกชื่อที่ทำงาน"
                    />
                    <datalist id="workplaces">
                      {workplaces.map((workplace) => (
                        <option key={workplace} value={workplace} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      อีเมล <span className="text-gray-500">(ไม่จำเป็น)</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ที่อยู่ปัจจุบัน <span className="text-gray-500">(ไม่จำเป็น)</span>
                    </label>
                    <textarea
                      value={formData.currentAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, currentAddress: e.target.value })
                      }
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                </div>

                {/* ข้อมูลการเช่า */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">ข้อมูลการเช่า</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      หอพัก <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.dormitoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, dormitoryId: e.target.value })
                      }
                      required
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    >
                      <option value="">เลือกหอพัก</option>
                      {dormitories.map((dorm) => (
                        <option key={dorm.id} value={dorm.id}>
                          {dorm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
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
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
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
                    <label className="block text-sm font-medium text-gray-700">
                      วันที่เข้าพัก <span className="text-gray-500">(ไม่จำเป็น)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เงินประกัน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.deposit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deposit: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                      min="0"
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      จำนวนผู้พักอาศัย <span className="text-gray-500">(ไม่จำเป็น)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.numberOfResidents}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numberOfResidents: parseInt(e.target.value) || 1,
                        })
                      }
                      min="1"
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* ผู้ติดต่อฉุกเฉิน */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">ผู้ติดต่อฉุกเฉิน <span className="text-gray-500">(ไม่จำเป็น)</span></h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContact.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            name: e.target.value,
                          },
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ความสัมพันธ์
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContact.relationship}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            relationship: e.target.value,
                          },
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เบอร์โทรศัพท์
                    </label>
                    <input
                      type="tel"
                      value={formData.emergencyContact.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: {
                            ...formData.emergencyContact,
                            phone: e.target.value,
                          },
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* ส่วนของรายการพิเศษ */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">รายการพิเศษ</h3>
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
                          className="w-full px-3 py-2 border rounded-md"
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
                          className="w-full px-3 py-2 border rounded-md"
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
                          className="w-full px-3 py-2 border rounded-md"
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
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecialItem(item.id)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded-full"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddSpecialItem}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus size={16} className="mr-1" /> เพิ่มรายการพิเศษ
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 