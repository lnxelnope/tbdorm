"use client";

import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import type { Dormitory, Room, SpecialItem } from '@/types/dormitory'
import { toast } from "sonner";
import { addTenant, getRooms } from "@/lib/firebase/firebaseUtils";
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, where, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { v4 as uuidv4 } from "uuid";

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
  roomId: string;
  specialItems: SpecialItem[];
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
    roomId: "",
    specialItems: [],
  });
  const [isIdCardLocked, setIsIdCardLocked] = useState(false);
  const [workplaces, setWorkplaces] = useState<string[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

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

  // โหลดข้อมูลห้องเมื่อเลือกหอพัก
  useEffect(() => {
    const loadRooms = async () => {
      if (!formData.dormitoryId) {
        setAvailableRooms([]);
        return;
      }

      try {
        const result = await getRooms(formData.dormitoryId);
        if (result.success && result.data) {
          // กรองเฉพาะห้องที่ว่างหรือมีสถานะผิดปกติ
          const emptyRooms = result.data.filter(room => room.status === 'available' || room.status === 'abnormal');
          const sortedRooms = emptyRooms.sort((a, b) => {
            // เรียงตามเลขห้อง
            return a.number.localeCompare(b.number, undefined, { numeric: true });
          });
          setAvailableRooms(sortedRooms);
        }
      } catch (error) {
        console.error("Error loading rooms:", error);
        setAvailableRooms([]);
      }
    };

    loadRooms();
  }, [formData.dormitoryId]);

  // เพิ่มฟังก์ชันสำหรับจัดการรายการพิเศษ
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
              <p>พบประวัติการเช่าล่าสุด:</p>
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

    // เพิ่ม specialItems ในข้อมูลที่จะบันทึก
    const tenantData = {
      name: formData.name,
      idCard: formData.idCard,
      phone: formData.phone,
      email: formData.email,
      lineId: formData.lineId,
      currentAddress: formData.currentAddress,
      workplace: formData.workplace,
      dormitoryId: formData.dormitoryId,
      roomId: formData.roomId,
      roomNumber: roomData.number,
      roomType: roomData.roomType,
      status: "active",
      startDate: formData.startDate,
      deposit: parseFloat(formData.deposit) || 0,
      numberOfResidents: formData.numberOfResidents,
      emergencyContact: formData.emergencyContact,
      outstandingBalance: formData.outstandingBalance,
      specialItems: formData.specialItems.map(item => ({
        ...item,
        remainingBillingCycles: item.duration > 0 ? item.duration : undefined
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      };

      // เริ่ม transaction
      const batch = writeBatch(db);

      // เพิ่มผู้เช่า
      const tenantRef = doc(collection(db, `dormitories/${formData.dormitoryId}/tenants`));
    batch.set(tenantRef, tenantData);

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

if (!isOpen) return null;

  return (
  <div className="fixed inset-0 z-50">
    <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">เพิ่มผู้เช่าใหม่</h2>
              <button
                type="button"
                onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
              >
            <X size={24} />
              </button>
            </div>
        <div className="p-4 overflow-y-auto flex-1">
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
                    <select
                      value={formData.roomNumber}
                      onChange={(e) => {
                        const selectedRoom = availableRooms.find(room => room.number === e.target.value);
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
                      {availableRooms.map((room) => (
                        <option key={room.id} value={room.number}>
                          {room.number} - ชั้น {room.floor} 
                          {room.roomType && ` (${room.roomType})`}
                        </option>
                      ))}
                    </select>
                    {availableRooms.length === 0 && formData.dormitoryId && (
                      <p className="mt-1 text-sm text-yellow-600">
                        ไม่มีห้องว่างในหอพักนี้
                      </p>
                    )}
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

            <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
                disabled={isSubmitting}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  disabled={isSubmitting}
                >
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
  </div>
);
} 