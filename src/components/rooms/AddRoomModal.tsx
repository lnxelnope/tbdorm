"use client";

import { useState, useEffect } from "react";
import { Room, RoomType, DormitoryConfig } from "@/types/dormitory";
import { addRoom, getInitialMeterReading, getRooms, getDormitory } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { X } from "lucide-react";

interface AddRoomModalProps {
  dormitoryId: string;
  roomTypes: RoomType[];
  onClose: () => void;
  onSuccess: (room: Room) => void;
  isOpen: boolean;
  totalFloors: number;
}

// เพิ่มฟังก์ชั่นสำหรับแปลง range string เป็น array ของเลขห้อง
const parseRoomNumberRanges = (rangeString: string): string[] => {
  const roomNumbers: string[] = [];
  
  // แยก range ด้วยเครื่องหมาย ,
  const ranges = rangeString.split(',').map(r => r.trim());
  
  ranges.forEach(range => {
    // ตรวจสอบว่าเป็น range หรือเลขห้องเดี่ยว
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(n => parseInt(n));
      // ตรวจสอบว่า start และ end เป็นตัวเลขที่ถูกต้อง
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        // สร้างเลขห้องในช่วง start ถึง end
        for (let i = start; i <= end; i++) {
          roomNumbers.push(i.toString().padStart(3, '0'));
        }
      }
    } else {
      // กรณีเป็นเลขห้องเดี่ยว
      const num = parseInt(range);
      if (!isNaN(num)) {
        roomNumbers.push(num.toString().padStart(3, '0'));
      }
    }
  });
  
  return roomNumbers;
};

// แก้ไข interface FormData เพื่อรองรับ batch creation
interface FormData {
  numbers: string; // เปลี่ยนจาก number เป็น numbers สำหรับรับ range string
  floor: number;
  roomType: string;
  status: Room['status'];
  initialMeterReading: string;
  additionalServices: string[]; // เพิ่มฟิลด์ใหม่
}

export default function AddRoomModal({
  isOpen,
  onClose,
  dormitoryId,
  onSuccess,
  roomTypes: initialRoomTypes,
  totalFloors,
}: AddRoomModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(initialRoomTypes);
  const [dormitoryConfig, setDormitoryConfig] = useState<DormitoryConfig | null>(null);
  const [existingRooms, setExistingRooms] = useState<Room[]>([]);
  
  // ย้าย useState ของ formData มาไว้ด้านบน
  const defaultRoomType = Array.isArray(roomTypes) ? (roomTypes.find(type => type.isDefault) || roomTypes[0]) : null;
  const [formData, setFormData] = useState<FormData>({
    numbers: "",
    floor: 1,
    roomType: defaultRoomType?.id || "",
    status: "available",
    initialMeterReading: "0",
    additionalServices: [], // เพิ่มค่าเริ่มต้น
  });
  
  // เพิ่ม useEffect เพื่อดึงข้อมูล dormitory config
  useEffect(() => {
    const fetchDormitoryConfig = async () => {
      const result = await getDormitory(dormitoryId);
      if (result.success && result.data?.config) {
        setDormitoryConfig(result.data.config);
      }
    };
    fetchDormitoryConfig();
  }, [dormitoryId]);
  
  // ถ้าไม่มีรูปแบบห้องให้แจ้งเตือน
  useEffect(() => {
    if (!Array.isArray(roomTypes) || roomTypes.length === 0) {
      toast.error("กรุณาเพิ่มรูปแบบห้องพักก่อน");
      onClose();
      return;
    }
  }, [roomTypes, onClose]);
  
  // อัพเดท roomType เมื่อ defaultRoomType เปลี่ยน
  useEffect(() => {
    if (defaultRoomType) {
      setFormData(prev => ({
        ...prev,
        roomType: defaultRoomType.id
      }));
    }
  }, [defaultRoomType]);
  
  // เพิ่ม useEffect เพื่อดึงค่ามิเตอร์เริ่มต้น
  useEffect(() => {
    const fetchInitialMeterReading = async () => {
      const reading = await getInitialMeterReading(dormitoryId);
      setFormData(prev => ({
        ...prev,
        initialMeterReading: reading.toString()
      }));
    };

    if (isOpen) {
      fetchInitialMeterReading();
    }
  }, [dormitoryId, isOpen]);
  
  // โหลดข้อมูลห้องที่มีอยู่แล้ว
  useEffect(() => {
    const loadExistingRooms = async () => {
      try {
        const result = await getRooms(dormitoryId);
        if (result.success && result.data) {
          setExistingRooms(result.data);
        }
      } catch (error) {
        console.error('Error loading existing rooms:', error);
      }
    };

    loadExistingRooms();
  }, [dormitoryId]);
  
  if (!defaultRoomType) {
    return null;
  }

  // ตรวจสอบว่าเลขห้องซ้ำหรือไม่
  const isRoomNumberTaken = (number: string) => {
    return existingRooms.some(room => 
      room.number === number && room.status === 'occupied'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // แปลง range string เป็น array ของเลขห้อง
    const roomNumbers = parseRoomNumberRanges(formData.numbers);
    
    // ตรวจสอบว่ามีเลขห้องที่ถูกต้องหรือไม่
    if (roomNumbers.length === 0) {
      toast.error("กรุณาระบุเลขห้องให้ถูกต้อง");
      setIsSubmitting(false);
      return;
    }
    
    // ตรวจสอบว่ามีเลขห้องที่ซ้ำกับห้องที่มีอยู่แล้วหรือไม่
    const duplicateRooms = roomNumbers.filter(num => 
      existingRooms.some(room => room.number === num)
    );
    
    if (duplicateRooms.length > 0) {
      toast.error(`เลขห้อง ${duplicateRooms.join(', ')} มีอยู่แล้ว`);
      setIsSubmitting(false);
      return;
    }
    
    // เริ่มการสร้างห้องพัก
    setProgress({ current: 0, total: roomNumbers.length });
    
    try {
      for (let i = 0; i < roomNumbers.length; i++) {
        const roomNumber = roomNumbers[i];
        
        // สร้างข้อมูลห้องพัก
        const newRoom: Omit<Room, 'id'> = {
          dormitoryId,
          number: roomNumber,
          floor: formData.floor,
          roomType: formData.roomType,
          status: formData.status,
          initialMeterReading: parseFloat(formData.initialMeterReading) || 0,
          additionalServices: formData.additionalServices,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // เพิ่มห้องพักลงในฐานข้อมูล
        const result = await addRoom(dormitoryId, newRoom);
        
        if (!result.success) {
          throw new Error(`ไม่สามารถเพิ่มห้อง ${roomNumber} ได้`);
        }
        
        // อัพเดทความคืบหน้า
        setProgress({ current: i + 1, total: roomNumbers.length });
      }
      
      // เมื่อเพิ่มห้องพักสำเร็จทั้งหมด
      toast.success(`เพิ่มห้องพักสำเร็จ ${roomNumbers.length} ห้อง`);
      
      // เรียกใช้ callback onSuccess
      if (roomNumbers.length === 1 && onSuccess) {
        // ถ้าเพิ่มห้องเดียว ส่งข้อมูลห้องกลับไป
        const result = await getRooms(dormitoryId);
        if (result.success && result.data) {
          const addedRoom = result.data.find(r => r.number === roomNumbers[0]);
          if (addedRoom) {
            onSuccess(addedRoom);
          }
        }
      } else if (onSuccess) {
        // ถ้าเพิ่มหลายห้อง ส่งข้อมูลห้องแรกกลับไป (เพื่อให้ตรงกับ interface)
        const result = await getRooms(dormitoryId);
        if (result.success && result.data) {
          const addedRoom = result.data.find(r => r.number === roomNumbers[0]);
          if (addedRoom) {
            onSuccess(addedRoom);
          }
        }
      }
      
      // ปิด modal
      onClose();
    } catch (error) {
      console.error("Error adding rooms:", error);
      toast.error("เกิดข้อผิดพลาดในการเพิ่มห้องพัก");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">เพิ่มห้องพักใหม่</h2>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เลขห้อง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="numbers"
                  value={formData.numbers}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isRoomNumberTaken(value)) {
                      toast.error('เลขห้องนี้มีผู้เช่าอยู่แล้ว');
                      return;
                    }
                    setFormData({ ...formData, numbers: value });
                  }}
                  className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm px-4 py-2.5"
                  placeholder="เช่น 101-105, 201, 203"
                />
                <p className="mt-1 text-sm text-gray-500">
                  สามารถระบุเป็นช่วงได้ เช่น 101-105 หรือระบุทีละห้องได้ เช่น 201, 203
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชั้น <span className="text-red-500">*</span>
                </label>
                <select
                  name="floor"
                  value={formData.floor}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: parseInt(e.target.value) })
                  }
                  className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                >
                  <option value="">เลือกชั้น</option>
                  {Array.from({ length: totalFloors }, (_, i) => i + 1).map((floor) => (
                    <option key={floor} value={floor}>
                      ชั้น {floor}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รูปแบบห้อง <span className="text-red-500">*</span>
                </label>
                <select
                  name="roomType"
                  value={formData.roomType}
                  onChange={(e) =>
                    setFormData({ ...formData, roomType: e.target.value })
                  }
                  className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                >
                  <option value="">เลือกประเภทห้อง</option>
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}: {type.basePrice?.toLocaleString() ?? 0} บาท/เดือน
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ค่ามิเตอร์เริ่มต้น
                </label>
                <input
                  type="number"
                  name="initialMeterReading"
                  value={formData.initialMeterReading}
                  onChange={(e) =>
                    setFormData({ ...formData, initialMeterReading: e.target.value })
                  }
                  min="0"
                  className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                  placeholder="ค่ามิเตอร์เริ่มต้น"
                />
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">บริการเสริม</h3>
                <div className="space-y-2">
                  {dormitoryConfig?.additionalFees?.items?.map((service) => (
                    <div key={service.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`service-${service.id}`}
                        checked={formData.additionalServices.includes(service.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData({
                            ...formData,
                            additionalServices: checked
                              ? [...formData.additionalServices, service.id]
                              : formData.additionalServices.filter(id => id !== service.id)
                          });
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`service-${service.id}`} className="ml-2 block text-sm text-gray-900">
                        {service.name} (+{service.amount} บาท)
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 