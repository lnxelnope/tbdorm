"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { X } from "lucide-react";
import { Dormitory } from "@/types/dormitory";
import { toast } from "sonner";
import { updateTenant } from "@/lib/firebase/firebaseUtils";

interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: {
    id: string;
    name: string;
    idCard: string;
    phone: string;
    email: string;
    lineId: string;
    currentAddress: string;
    dormitoryId: string;
    roomNumber: string;
    startDate: string;
    deposit: number;
    numberOfResidents: number;
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
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
  const [formData, setFormData] = useState({
    name: tenant.name,
    idCard: tenant.idCard,
    phone: tenant.phone,
    email: tenant.email,
    lineId: tenant.lineId,
    currentAddress: tenant.currentAddress,
    dormitoryId: tenant.dormitoryId,
    roomNumber: tenant.roomNumber,
    startDate: tenant.startDate,
    deposit: tenant.deposit,
    numberOfResidents: tenant.numberOfResidents,
    emergencyContact: {
      name: tenant.emergencyContact.name,
      relationship: tenant.emergencyContact.relationship,
      phone: tenant.emergencyContact.phone,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // อัพเดทข้อมูลในฟอร์มเมื่อ tenant เปลี่ยน
    setFormData({
      name: tenant.name,
      idCard: tenant.idCard,
      phone: tenant.phone,
      email: tenant.email,
      lineId: tenant.lineId,
      currentAddress: tenant.currentAddress,
      dormitoryId: tenant.dormitoryId,
      roomNumber: tenant.roomNumber,
      startDate: tenant.startDate,
      deposit: tenant.deposit,
      numberOfResidents: tenant.numberOfResidents,
      emergencyContact: {
        name: tenant.emergencyContact.name,
        relationship: tenant.emergencyContact.relationship,
        phone: tenant.emergencyContact.phone,
      },
    });
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Submitting form data:', formData);
      const result = await updateTenant(tenant.dormitoryId, tenant.id, formData);
      console.log('Update tenant result:', result);
      
      if (result.success) {
        toast.success("แก้ไขข้อมูลผู้เช่าเรียบร้อยแล้ว");
        onSuccess();
        onClose();
      } else {
        console.error('Error from updateTenant:', result.error);
        toast.error(result.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้เช่า");
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
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-xl bg-white">
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    เลขบัตรประชาชน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.idCard}
                    onChange={(e) =>
                      setFormData({ ...formData, idCard: e.target.value })
                    }
                    required
                    maxLength={13}
                    pattern="[0-9]{13}"
                    title="กรุณากรอกเลขบัตรประชาชน 13 หลัก"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Line ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lineId}
                    onChange={(e) =>
                      setFormData({ ...formData, lineId: e.target.value })
                    }
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, roomNumber: e.target.value })
                    }
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
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
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 