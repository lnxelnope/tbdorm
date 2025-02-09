"use client";

import { useState } from "react";
import { Room, RoomType } from "@/types/dormitory";
import { updateRoom } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";

interface EditRoomModalProps {
  room: Room;
  roomTypes: RoomType[];
  onClose: () => void;
  onSuccess: (room: Room) => void;
  dormitoryId: string;
  totalFloors: number;
}

export default function EditRoomModal({ room, roomTypes, onClose, onSuccess, dormitoryId, totalFloors }: EditRoomModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    number: room.number,
    floor: room.floor,
    roomType: room.roomType,
    hasAirConditioner: room.hasAirConditioner,
    hasParking: room.hasParking,
    status: room.status,
    initialMeterReading: room.initialMeterReading || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.number.trim()) {
      toast.error("กรุณากรอกเลขห้อง");
      return;
    }

    if (!formData.roomType) {
      toast.error("กรุณาเลือกรูปแบบห้อง");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await updateRoom(dormitoryId, room.id, {
        ...formData,
        number: formData.number.trim(),
      });

      if (result.success) {
        toast.success("แก้ไขห้องพักเรียบร้อย");
        onSuccess({
          ...room,
          ...formData,
        });
      } else {
        toast.error("ไม่สามารถแก้ไขห้องพักได้");
      }
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไขห้องพัก");
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">แก้ไขห้องพัก</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                เลขห้อง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="number"
                value={formData.number}
                onChange={handleChange}
                className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                placeholder="เลขห้อง เช่น 101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชั้น <span className="text-red-500">*</span>
              </label>
              <select
                name="floor"
                value={formData.floor}
                onChange={handleChange}
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
                <option value="standard">ห้องธรรมดา</option>
                <option value="aircon">ห้องแอร์</option>
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

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasAirConditioner}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasAirConditioner: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">แอร์</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasParking}
                  onChange={(e) =>
                    setFormData({ ...formData, hasParking: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">ที่จอดรถ</span>
              </label>
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
  );
} 