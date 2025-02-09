"use client";

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Dormitory } from '@/types/dormitory'
import { toast } from "sonner";
import { addTenant } from "@/lib/firebase/firebaseUtils";
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, where, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

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
  workplace: string;
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
    workplace: "",
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
  const [isIdCardLocked, setIsIdCardLocked] = useState(false);
  const [workplaces, setWorkplaces] = useState<string[]>([]);

  // โหลดข้อมูลที่ทำงานที่มีอยู่
  useEffect(() => {
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

    loadWorkplaces();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (!formData.name || !formData.roomNumber || !formData.dormitoryId) {
        toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }

      // ตรวจสอบประวัติผู้เช่าจากเลขบัตรประชาชน
      const tenantHistoryRef = collection(db, 'tenant_history');
      const q = query(tenantHistoryRef, where('idCard', '==', formData.idCard), where('type', '==', 'quit'));
      const historySnapshot = await getDocs(q);
      
      if (!historySnapshot.empty) {
        // พบประวัติผู้เช่าเก่า
        const history = historySnapshot.docs[0].data();
        
        // หาชื่อหอพักจากประวัติ
        const previousDormitory = dormitories.find(d => d.id === history.dormitoryId);
        
        // แสดง dialog แจ้งเตือนว่าเป็นผู้เช่าเก่า
        const shouldProceed = await new Promise<boolean>((resolve) => {
          const dialog = document.createElement('dialog');
          dialog.className = 'p-4 rounded-lg shadow-lg bg-white max-w-md w-full';
          
          const content = document.createElement('div');
          content.className = 'space-y-4';
          content.innerHTML = `
            <h3 class="text-lg font-medium text-red-600">⚠️ พบประวัติการเช่าเก่า</h3>
            <div class="space-y-2 text-sm">
              <p>พบประวัติการเช่าเก่าจากเลขบัตรประชาชนนี้:</p>
              <div class="bg-gray-50 p-3 rounded-lg space-y-1">
                <p>ประวัติการเช่าล่าสุด:</p>
                <ul class="list-disc pl-4 space-y-1 text-gray-600">
                  <li>เคยเช่าที่: ${previousDormitory?.name || 'ไม่พบข้อมูลหอพัก'}</li>
                  <li>เคยเช่าห้อง: ${history.roomNumber}</li>
                  <li>วันที่เริ่มเช่า: ${new Date(history.startDate).toLocaleDateString('th-TH')}</li>
                  <li>วันที่ย้ายออก: ${new Date(history.quitDate).toLocaleDateString('th-TH')}</li>
                  ${history.outstandingBalance > 0 ? 
                    `<li class="text-red-500 font-medium">มียอดค้างชำระ: ${history.outstandingBalance.toLocaleString()} บาท</li>` 
                    : ''
                  }
                </ul>
              </div>
              ${history.outstandingBalance > 0 ? 
                `<p class="text-red-500 font-medium">⚠️ กรุณาตรวจสอบการชำระยอดค้างก่อนดำเนินการต่อ</p>` 
                : ''
              }
              <p class="mt-4">ต้องการดำเนินการเพิ่มผู้เช่าต่อหรือไม่?</p>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <button class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" data-action="cancel">
                ยกเลิก
              </button>
              <button class="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg" data-action="proceed">
                ดำเนินการต่อ
              </button>
            </div>
          `;

          content.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const action = target.getAttribute('data-action');
            if (action === 'proceed') resolve(true);
            else if (action === 'cancel') resolve(false);
            dialog.close();
          });

          dialog.appendChild(content);
          document.body.appendChild(dialog);
          dialog.showModal();

          dialog.addEventListener('close', () => {
            document.body.removeChild(dialog);
            resolve(false);
          });
        });

        if (!shouldProceed) {
          setIsSubmitting(false);
          return;
        }

        // ถ้ามียอดค้างชำระ ให้แสดง warning อีกครั้ง
        if (history.outstandingBalance > 0) {
          const confirmProceed = window.confirm(
            `ผู้เช่ารายนี้มียอดค้างชำระ ${history.outstandingBalance.toLocaleString()} บาท\nยืนยันที่จะดำเนินการต่อหรือไม่?`
          );
          if (!confirmProceed) {
            setIsSubmitting(false);
            return;
          }
        }
      }

      // ตรวจสอบสถานะห้องก่อนเพิ่มผู้เช่า
      const roomsRef = collection(db, `dormitories/${formData.dormitoryId}/rooms`);
      const roomsSnapshot = await getDocs(roomsRef);
      const room = roomsSnapshot.docs.find(doc => doc.data().number === formData.roomNumber);

      if (!room) {
        toast.error("ไม่พบห้องที่ระบุ");
        return;
      }

      const roomData = room.data();
      if (roomData.status === 'occupied') {
        toast.error("ห้องนี้มีผู้เช่าอยู่แล้ว");
        return;
      }

      if (roomData.status === 'maintenance') {
        toast.error("ห้องนี้อยู่ระหว่างปรับปรุง");
        return;
      }

      // บันทึกที่ทำงานใหม่ถ้ายังไม่มีในระบบ
      if (formData.workplace && !workplaces.includes(formData.workplace)) {
        try {
          await addDoc(collection(db, 'workplaces'), {
            name: formData.workplace,
            createdAt: new Date()
          });
        } catch (error) {
          console.error('Error saving workplace:', error);
        }
      }

      const submitData = {
        ...formData,
        deposit: formData.deposit ? Number(formData.deposit) : 0,
        outstandingBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active' as const,
      };

      // เริ่ม transaction
      const batch = writeBatch(db);

      // เพิ่มผู้เช่า
      const tenantRef = doc(collection(db, `dormitories/${formData.dormitoryId}/tenants`));
      batch.set(tenantRef, submitData);

      // อัพเดทสถานะห้องเป็น occupied
      batch.update(doc(db, `dormitories/${formData.dormitoryId}/rooms`, room.id), {
        status: 'occupied',
        updatedAt: serverTimestamp(),
      });

      // ดำเนินการ transaction
      await batch.commit();
      
      toast.success("เพิ่มผู้เช่าเรียบร้อย");
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding tenant:', error)
      toast.error("เกิดข้อผิดพลาดในการเพิ่มผู้เช่า");
    } finally {
      setIsSubmitting(false)
    }
  }

  // เพิ่มฟังก์ชันสำหรับจัดการการกรอกเลขบัตรประชาชน
  const handleIdCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 13);
    setFormData({ ...formData, idCard: value });
    
    // ล็อคฟิลด์เมื่อกรอกครบ 13 หลัก
    if (value.length === 13) {
      setIsIdCardLocked(true);
    }
  };

  // เพิ่มฟังก์ชันสำหรับปลดล็อคเลขบัตรประชาชน
  const handleUnlockIdCard = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะแก้ไขเลขบัตรประชาชน?')) {
      setIsIdCardLocked(false);
      setFormData({ ...formData, idCard: '' });
    }
  };

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
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.idCard}
                        onChange={handleIdCardChange}
                        pattern="\d{13}"
                        maxLength={13}
                        placeholder="กรุณากรอกเลขบัตรประชาชน 13 หลัก"
                        required
                        readOnly={isIdCardLocked}
                        className={`mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 ${isIdCardLocked ? 'bg-gray-100' : ''}`}
                      />
                      {isIdCardLocked && (
                        <button
                          type="button"
                          onClick={handleUnlockIdCard}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          แก้ไข
                        </button>
                      )}
                    </div>
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
                      onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
                      list="workplaces"
                      className="mt-1 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder="ชื่อบริษัท/สถานที่ทำงาน"
                    />
                    <datalist id="workplaces">
                      {workplaces.map((workplace, index) => (
                        <option key={index} value={workplace} />
                      ))}
                    </datalist>
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