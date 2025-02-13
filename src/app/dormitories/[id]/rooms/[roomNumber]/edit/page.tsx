"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getRoomTypes, updateRoom, getRooms } from "@/lib/firebase/firebaseUtils";
import { Room, RoomType } from "@/types/dormitory";

interface FormData {
  number: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance' | 'moving_out';
  roomType: string;
  initialMeterReading: number;
  additionalServices: string[];
}

export default function EditRoomPage() {
  const params = useParams();
  const router = useRouter();
  const dormId = params.id as string;
  const roomNumber = params.roomNumber as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [formData, setFormData] = useState<FormData>({
    number: "",
    floor: 1,
    roomType: "",
    status: "available" as Room["status"],
    initialMeterReading: 0,
    additionalServices: [],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [roomsResult, roomTypesResult] = await Promise.all([
          getRooms(dormId),
          getRoomTypes(dormId),
        ]);

        if (roomsResult.success && roomsResult.data) {
          const foundRoom = roomsResult.data.find(r => r.number === roomNumber);
          if (foundRoom) {
            setRoom(foundRoom);
            setFormData({
              number: foundRoom.number,
              floor: foundRoom.floor,
              roomType: foundRoom.roomType,
              status: foundRoom.status,
              initialMeterReading: foundRoom.initialMeterReading || 0,
              additionalServices: foundRoom.additionalServices || [],
            });
          }
        }

        if (roomTypesResult.success && roomTypesResult.data) {
          setRoomTypes(roomTypesResult.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    if (dormId && roomNumber) {
      loadData();
    }
  }, [dormId, roomNumber]);

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

      if (!room) {
        toast.error("ไม่พบข้อมูลห้องพัก");
        return;
      }

      const result = await updateRoom(dormId, room.id, {
        ...formData,
        number: formData.number.trim(),
      });

      if (result.success) {
        toast.success("แก้ไขห้องพักเรียบร้อย");
        router.push(`/dormitories/${dormId}/rooms/${formData.number}`);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบข้อมูลห้องพัก</h3>
          <Link
            href={`/dormitories/${dormId}/rooms`}
            className="text-blue-600 hover:text-blue-900"
          >
            กลับไปหน้ารายการห้องพัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link
          href={`/dormitories/${dormId}/rooms/${roomNumber}`}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          กลับ
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">แก้ไขข้อมูลห้องพัก</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                เลขห้อง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.number}
                onChange={(e) =>
                  setFormData({ ...formData, number: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ชั้น <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.floor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    floor: parseInt(e.target.value) || 1,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                รูปแบบห้อง <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.roomType}
                onChange={(e) =>
                  setFormData({ ...formData, roomType: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">เลือกรูปแบบห้อง</option>
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {type.basePrice.toLocaleString()} บาท/เดือน
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
                min="0"
                value={formData.initialMeterReading}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    initialMeterReading: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href={`/dormitories/${dormId}/rooms/${roomNumber}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ยกเลิก
              </Link>
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