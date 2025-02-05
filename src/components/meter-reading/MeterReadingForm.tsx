"use client";

import { useState } from "react";
import { Camera } from "lucide-react";

interface MeterReadingFormData {
  dormitoryId: string;
  roomId: string;
  type: "electricity" | "water";
  currentReading: number;
  photo?: File;
}

export default function MeterReadingForm() {
  const [formData, setFormData] = useState<MeterReadingFormData>({
    dormitoryId: "",
    roomId: "",
    type: "electricity",
    currentReading: 0,
  });

  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const dormitories = [
    { id: "1", name: "หอพักสุขสบาย 1" },
    { id: "2", name: "หอพักสุขสบาย 2" },
    { id: "3", name: "หอพักสุขสบาย 3" },
  ];

  const rooms = [
    { id: "101", number: "101", dormitoryId: "1", previousReading: 1234 },
    { id: "102", number: "102", dormitoryId: "1", previousReading: 2345 },
    { id: "201", number: "201", dormitoryId: "2", previousReading: 3456 },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: บันทึกข้อมูลลง Firebase
    console.log(formData);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, photo: e.target.files[0] });
    }
  };

  const selectedRoom = rooms.find((room) => room.id === formData.roomId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="dormitoryId"
          className="block text-sm font-medium text-gray-700"
        >
          หอพัก
        </label>
        <select
          id="dormitoryId"
          value={formData.dormitoryId}
          onChange={(e) =>
            setFormData({
              ...formData,
              dormitoryId: e.target.value,
              roomId: "",
            })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          required
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
        <label
          htmlFor="roomId"
          className="block text-sm font-medium text-gray-700"
        >
          ห้องพัก
        </label>
        <select
          id="roomId"
          value={formData.roomId}
          onChange={(e) =>
            setFormData({ ...formData, roomId: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          required
        >
          <option value="">เลือกห้อง</option>
          {rooms
            .filter((room) => room.dormitoryId === formData.dormitoryId)
            .map((room) => (
              <option key={room.id} value={room.id}>
                ห้อง {room.number}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          ประเภทมิเตอร์
        </label>
        <div className="mt-1 space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="electricity"
              checked={formData.type === "electricity"}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as "electricity" | "water" })
              }
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">ไฟฟ้า</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="water"
              checked={formData.type === "water"}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as "electricity" | "water" })
              }
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">น้ำประปา</span>
          </label>
        </div>
      </div>

      {selectedRoom && (
        <div className="rounded-md bg-gray-50 p-4">
          <div className="text-sm text-gray-700">
            ค่ามิเตอร์ครั้งก่อน: {selectedRoom.previousReading}
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="currentReading"
          className="block text-sm font-medium text-gray-700"
        >
          ค่ามิเตอร์ปัจจุบัน
        </label>
        <input
          type="number"
          id="currentReading"
          value={formData.currentReading}
          onChange={(e) =>
            setFormData({
              ...formData,
              currentReading: Number(e.target.value),
            })
          }
          min={selectedRoom?.previousReading || 0}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          รูปถ่ายมิเตอร์
        </label>
        <div className="mt-1 flex items-center">
          <label
            htmlFor="photo"
            className="flex cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Camera className="mr-2 h-5 w-5 text-gray-400" />
            อัพโหลดรูปภาพ
            <input
              type="file"
              id="photo"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
          {formData.photo && (
            <span className="ml-4 text-sm text-gray-500">
              {formData.photo.name}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          บันทึกค่ามิเตอร์
        </button>
      </div>
    </form>
  );
} 