"use client";

import { useState, useEffect } from "react";
import { Room, RoomType, DormitoryConfig } from "@/types/dormitory";
import { updateRoom, getRooms, getDormitory } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { X } from "lucide-react";

interface UpdateRoomResult {
  success: boolean;
  data?: Room;
  error?: unknown;
}

interface EditRoomModalProps {
  room: Room;
  roomTypes: RoomType[];
  onClose: () => void;
  onSuccess: (room: Room) => void;
  dormitoryId: string;
  totalFloors: number;
  isOpen?: boolean;
}

interface FormData {
  number: string;
  floor: number;
  roomType: string;
  status: Room['status'];
  initialMeterReading: string;
  additionalServices: string[];
}

export default function EditRoomModal({ room, roomTypes, onClose, onSuccess, dormitoryId, totalFloors, isOpen = true }: EditRoomModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [dormitoryConfig, setDormitoryConfig] = useState<DormitoryConfig | null>(null);
  const [formData, setFormData] = useState<FormData>({
    number: room.number,
    floor: room.floor,
    roomType: room.roomType,
    status: room.status,
    initialMeterReading: room.initialMeterReading?.toString() || "0",
    additionalServices: room.additionalServices || [],
  });

  useEffect(() => {
    const fetchDormitoryConfig = async () => {
      const result = await getDormitory(dormitoryId);
      if (result.success && result.data?.config) {
        setDormitoryConfig(result.data.config);
      }
    };
    fetchDormitoryConfig();
  }, [dormitoryId]);

  useEffect(() => {
    const loadRooms = async () => {
      const result = await getRooms(dormitoryId);
      if (result.success && result.data) {
        setAllRooms(result.data);
      }
    };
    loadRooms();
  }, [dormitoryId]);

  // เพิ่มฟังก์ชันตรวจสอบเลขห้องซ้ำ
  const isRoomNumberTaken = (roomNumber: string) => {
    return allRooms.some(r => r.number === roomNumber && r.id !== room.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // ตรวจสอบว่าเลขห้องซ้ำกับห้องอื่นหรือไม่ (ยกเว้นห้องปัจจุบัน)
      if (formData.number !== room.number && isRoomNumberTaken(formData.number)) {
        toast.error("เลขห้องนี้มีอยู่แล้ว");
        setIsSubmitting(false);
        return;
      }

      // อัพเดทข้อมูลห้องพัก
      const updatedRoom: Partial<Room> = {
        number: formData.number,
        floor: formData.floor,
        roomType: formData.roomType,
        status: formData.status,
        initialMeterReading: parseFloat(formData.initialMeterReading) || 0,
        additionalServices: formData.additionalServices,
        updatedAt: new Date().toISOString(),
      };

      const result = await updateRoom(dormitoryId, room.id, updatedRoom);

      if (result.success && result.data) {
        toast.success("อัพเดทห้องพักเรียบร้อยแล้ว");
        onSuccess(result.data);
        onClose();
      } else {
        toast.error("ไม่สามารถอัพเดทห้องพักได้");
      }
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error("เกิดข้อผิดพลาดในการอัพเดทห้องพัก");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAdditionalServiceChange = (serviceId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      additionalServices: checked 
        ? [...prev.additionalServices, serviceId]
        : prev.additionalServices.filter(id => id !== serviceId)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">แก้ไขข้อมูลห้องพัก</h2>
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
                <label className="block text-sm font-medium text-gray-700">
                  เลขห้อง <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.number}
                  onChange={(e) => {
                    const selectedRoom = allRooms.find(r => r.number === e.target.value);
                    if (selectedRoom) {
                      if (selectedRoom.id !== room.id && selectedRoom.status === 'occupied') {
                        toast.error('ไม่สามารถเลือกห้องที่มีผู้เช่าอยู่แล้ว');
                        return;
                      }
                      setFormData(prev => ({
                        ...prev,
                        number: selectedRoom.number,
                        floor: selectedRoom.floor
                      }));
                    }
                  }}
                  required
                  className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                >
                  <option value="">เลือกห้อง</option>
                  {allRooms.map((r) => (
                    <option 
                      key={r.id} 
                      value={r.number}
                      disabled={r.id !== room.id && r.status === 'occupied'}
                    >
                      {r.number} - ชั้น {r.floor}
                      {r.roomType && ` (${r.roomType})`}
                      {r.id !== room.id && r.status === 'occupied' && ' - มีผู้เช่า'}
                    </option>
                  ))}
                </select>
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
                <label className="block text-sm font-medium text-gray-700">
                  รูปแบบห้อง <span className="text-red-500">*</span>
                </label>
                <select
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleChange}
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
                <label className="block text-sm font-medium text-gray-700">
                  สถานะ <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as Room["status"],
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="available">ว่าง</option>
                  <option value="occupied">มีผู้เช่า</option>
                  <option value="maintenance">ปรับปรุง</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ค่ามิเตอร์เริ่มต้น
                </label>
                <input
                  type="number"
                  name="initialMeterReading"
                  value={formData.initialMeterReading}
                  onChange={handleChange}
                  min="0"
                  className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                  placeholder="ค่ามิเตอร์เริ่มต้น"
                />
              </div>

              <div className="space-y-4 mt-4">
                <h3 className="text-sm font-medium text-gray-900">ค่าบริการเพิ่มเติม</h3>
                <div className="space-y-2">
                  {dormitoryConfig?.additionalFees?.items?.map((item) => (
                    <label key={item.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.additionalServices.includes(item.id)}
                        onChange={(e) => handleAdditionalServiceChange(item.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        {item.name} ({item.amount.toLocaleString()} บาท)
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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