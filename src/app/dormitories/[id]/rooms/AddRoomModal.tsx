"use client";

import { useState, useEffect } from "react";
import { Room, RoomType } from "@/types/dormitory";
import { addRoom } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import Modal from "@/components/ui/modal";

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
  hasAirConditioner: boolean;
  hasParking: boolean;
  status: Room['status'];
  initialMeterReading: string;
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
  
  // ย้าย useState ของ formData มาไว้ด้านบน
  const defaultRoomType = Array.isArray(roomTypes) ? (roomTypes.find(type => type.isDefault) || roomTypes[0]) : null;
  const [formData, setFormData] = useState<FormData>({
    numbers: "",
    floor: 1,
    roomType: defaultRoomType?.id || "",
    hasAirConditioner: false,
    hasParking: false,
    status: "available",
    initialMeterReading: "0",
  });
  
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
  
  if (!defaultRoomType) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numbers.trim() || !formData.roomType) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setIsSubmitting(true);
      const roomNumbers = parseRoomNumberRanges(formData.numbers);
      
      if (roomNumbers.length === 0) {
        toast.error("กรุณาระบุเลขห้องให้ถูกต้อง");
        setIsSubmitting(false);
        return;
      }

      setProgress({ current: 0, total: roomNumbers.length });

      // ตรวจสอบว่ามีเลขห้องซ้ำกันในการสร้างครั้งนี้หรือไม่
      const uniqueNumbers = new Set(roomNumbers);
      if (uniqueNumbers.size !== roomNumbers.length) {
        toast.error("มีเลขห้องที่ซ้ำกันในรายการที่จะสร้าง กรุณาตรวจสอบอีกครั้ง");
        setIsSubmitting(false);
        return;
      }

      // ดึงข้อมูลห้องที่มีอยู่แล้วทั้งหมด
      const existingRoomsSnapshot = await getDocs(collection(db, `dormitories/${dormitoryId}/rooms`));
      const existingRoomNumbers = existingRoomsSnapshot.docs.map(doc => doc.data().number);

      // ตรวจสอบว่ามีเลขห้องซ้ำกับที่มีอยู่แล้วหรือไม่
      const duplicateNumbers = roomNumbers.filter(number => existingRoomNumbers.includes(number));
      if (duplicateNumbers.length > 0) {
        toast.error(`เลขห้องต่อไปนี้มีอยู่แล้ว: ${duplicateNumbers.join(", ")}`);
        setIsSubmitting(false);
        return;
      }

      // สร้างห้องพักทีละห้อง
      let completedRooms = 0;
      const results = [];
      for (const number of roomNumbers) {
        const roomData: Omit<Room, "id"> = {
          dormitoryId,
          number,
          floor: formData.floor,
          roomType: formData.roomType,
          status: formData.status,
          hasAirConditioner: formData.hasAirConditioner,
          hasParking: formData.hasParking,
          initialMeterReading: parseFloat(formData.initialMeterReading) || 0,
        };

        const result = await addRoom(dormitoryId, roomData);
        results.push(result);
        completedRooms++;
        setProgress({ current: completedRooms, total: roomNumbers.length });
      }

      // ตรวจสอบผลลัพธ์
      const failedRooms = results.filter(result => !result.success);
      if (failedRooms.length > 0) {
        toast.error(`ไม่สามารถสร้างห้องพักได้ ${failedRooms.length} ห้อง`);
      } else {
        toast.success(`สร้างห้องพักสำเร็จ ${results.length} ห้อง`);
        // ส่งข้อมูลห้องแรกที่สร้างกลับไป
        const firstRoom = results[0];
        if (firstRoom.success && firstRoom.id) {
          onSuccess({ 
            id: firstRoom.id,
            dormitoryId,
            number: roomNumbers[0],
            floor: formData.floor,
            roomType: formData.roomType,
            hasAirConditioner: formData.hasAirConditioner,
            hasParking: formData.hasParking,
            status: formData.status,
            initialMeterReading: parseFloat(formData.initialMeterReading) || 0,
          });
        }
        onClose();
      }
    } catch (error) {
      console.error("Error adding rooms:", error);
      toast.error("เกิดข้อผิดพลาดในการเพิ่มห้องพัก");
    } finally {
      setIsSubmitting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-lg font-medium text-gray-900 mb-4">เพิ่มห้องพัก</h2>
        {isSubmitting && progress.total > 0 && (
          <div className="mb-4">
            <div className="text-center mb-2 text-xl font-semibold">
              กำลังเพิ่มห้องพัก {progress.current} จาก {progress.total} ห้อง
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              เลขห้อง <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.numbers}
              onChange={(e) =>
                setFormData({ ...formData, numbers: e.target.value })
              }
              placeholder="เช่น 001-010, 101-110"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              สามารถระบุเป็นช่วงได้ เช่น 001-010 หรือหลายช่วง เช่น 001-010,101-110
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ชั้น <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: totalFloors }, (_, i) => i + 1).map((floor) => (
                <label
                  key={floor}
                  className="relative flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="floor"
                    required
                    value={floor}
                    checked={formData.floor === floor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        floor: parseInt(e.target.value),
                      })
                    }
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    ชั้น {floor}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รูปแบบห้อง <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.roomType}
              onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
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
              value={formData.initialMeterReading}
              onChange={(e) =>
                setFormData({ ...formData, initialMeterReading: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              min="0"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasAirConditioner"
                checked={formData.hasAirConditioner}
                onChange={(e) =>
                  setFormData({ ...formData, hasAirConditioner: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="hasAirConditioner" className="ml-2 block text-sm text-gray-700">
                มีเครื่องปรับอากาศ
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="hasParking"
                checked={formData.hasParking}
                onChange={(e) =>
                  setFormData({ ...formData, hasParking: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="hasParking" className="ml-2 block text-sm text-gray-700">
                มีที่จอดรถ
              </label>
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
    </Modal>
  );
} 