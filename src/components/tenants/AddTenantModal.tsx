"use client";

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Dormitory } from '@/types/dormitory'
import { toast } from "sonner";
import { addTenant } from "@/lib/firebase/firebaseUtils";

interface AddTenantModalProps {
  isOpen: boolean
  onClose: () => void
  dormitories: Dormitory[]
  onSuccess: () => void
}

interface TenantFormData {
  name: string;
  idCard: string;
  phone: string;
  email: string;
  lineId: string;
  currentAddress: string;
  dormitoryId: string;
  roomNumber: string;
  startDate: string;
  deposit: string;
  numberOfResidents: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  outstandingBalance: number;
}

export default function AddTenantModal({ isOpen, onClose, dormitories, onSuccess }: AddTenantModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<TenantFormData>({
    name: "",
    idCard: "",
    phone: "",
    email: "",
    lineId: "",
    currentAddress: "",
    dormitoryId: dormitories[0]?.id || "",
    roomNumber: "",
    startDate: new Date().toISOString().split("T")[0],
    deposit: "",
    numberOfResidents: 1,
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
    outstandingBalance: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (!formData.name || !formData.roomNumber || !formData.dormitoryId) {
        toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }

      const submitData = {
        ...formData,
        deposit: formData.deposit ? Number(formData.deposit) : 0,
        outstandingBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active' as const,
      };

      const result = await addTenant(submitData);
      
      if (result.success) {
        toast.success("เพิ่มผู้เช่าเรียบร้อย");
        onSuccess();
        onClose();
      } else {
        toast.error(result.error?.toString() || "เกิดข้อผิดพลาดในการเพิ่มผู้เช่า");
      }
    } catch (error) {
      console.error('Error adding tenant:', error)
      toast.error("เกิดข้อผิดพลาดในการเพิ่มผู้เช่า");
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30" 
        onClick={onClose}
        style={{ zIndex: 1000 }}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 1001 }}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">เพิ่มผู้เช่า</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ฟอร์มข้อมูลผู้เช่า */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ข้อมูลส่วนตัว */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                        setFormData({ ...formData, idCard: value });
                      }}
                      pattern="\d{13}"
                      maxLength={13}
                      placeholder="กรุณากรอกเลขบัตรประชาชน 13 หลัก"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Line ID
                    </label>
                    <input
                      type="text"
                      value={formData.lineId}
                      onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ที่อยู่ปัจจุบัน
                    </label>
                    <textarea
                      value={formData.currentAddress}
                      onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                </div>

                {/* ข้อมูลการเช่า */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      หอพัก <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.dormitoryId}
                      onChange={(e) => setFormData({ ...formData, dormitoryId: e.target.value })}
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
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      วันที่เข้าพัก <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
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
                      onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                      placeholder="กรุณากรอกจำนวนเงินประกัน"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      จำนวนผู้พักอาศัย <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.numberOfResidents}
                      onChange={(e) => setFormData({ ...formData, numberOfResidents: Number(e.target.value) })}
                      required
                      min="1"
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  {/* ผู้ติดต่อฉุกเฉิน */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ผู้ติดต่อฉุกเฉิน
                    </label>
                    <div className="mt-1 space-y-4">
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
                        placeholder="ชื่อ-นามสกุล"
                        className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      />
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
                        placeholder="ความสัมพันธ์"
                        className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      />
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
                        placeholder="เบอร์โทรศัพท์"
                        className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
} 