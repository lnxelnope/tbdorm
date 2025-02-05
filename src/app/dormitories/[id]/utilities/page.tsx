"use client";

import { useState, useEffect } from "react";
import { Plus, Filter, Search, FileText } from "lucide-react";
import { Room, UtilityReading } from "@/types/dormitory";
import {
  getRooms,
  getUtilityReadings,
  addUtilityReading,
  getLineNotifyConfig,
} from "@/lib/firebase/firebaseUtils";
import { sendUtilityReadingNotification } from "@/lib/notifications/lineNotify";
import Link from "next/link";
import { toast } from "sonner";

export default function UtilitiesPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"water" | "electric">("water");
  const [formData, setFormData] = useState({
    currentReading: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadInitialData();
  }, [params.id]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [roomsResult, readingsResult] = await Promise.all([
        getRooms(params.id),
        getUtilityReadings(params.id),
      ]);

      if (roomsResult.success && roomsResult.data) {
        setRooms(roomsResult.data);
      }
      if (readingsResult.success && readingsResult.data) {
        setReadings(readingsResult.data);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      toast.error("กรุณาเลือกห้อง");
      return;
    }

    const currentReading = parseFloat(formData.currentReading);
    if (isNaN(currentReading) || currentReading < 0) {
      toast.error("กรุณาระบุค่ามิเตอร์ให้ถูกต้อง");
      return;
    }

    const room = rooms.find((r) => r.id === selectedRoom);
    if (!room) return;

    // หาค่ามิเตอร์ล่าสุดของห้องและประเภทที่เลือก
    const latestReading = readings
      .filter((r) => r.roomId === selectedRoom && r.type === selectedType)
      .sort((a, b) => b.readingDate.getTime() - a.readingDate.getTime())[0];

    try {
      const readingData: Omit<UtilityReading, "id" | "createdAt"> = {
        roomId: selectedRoom,
        dormitoryId: params.id,
        type: selectedType,
        previousReading: currentReading,
        currentReading: currentReading,
        readingDate: latestReading ? new Date(latestReading.readingDate) : new Date(),
        units: 0,
        createdBy: "admin",
      };

      const result = await addUtilityReading(params.id, readingData);
      if (result.success) {
        // ส่งแจ้งเตือนผ่าน LINE
        const lineConfig = await getLineNotifyConfig(params.id);
        if (lineConfig.success && lineConfig.data) {
          await sendUtilityReadingNotification(
            lineConfig.data,
            room.number,
            selectedType,
            currentReading,
            currentReading,
            0
          );
        }

        toast.success("แก้ไขค่ามิเตอร์เรียบร้อย");
        setFormData({ currentReading: "" });
        loadInitialData();
      }
    } catch (error) {
      console.error("Error adding utility reading:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกค่ามิเตอร์");
    }
  };

  const handleResetReading = async (roomId: string, type: "water" | "electric") => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      const readingData: Omit<UtilityReading, "id" | "createdAt"> = {
        roomId: roomId,
        dormitoryId: params.id,
        type: type,
        previousReading: 0,
        currentReading: 0,
        readingDate: new Date(),
        units: 0,
        createdBy: "admin",
      };

      const result = await addUtilityReading(params.id, readingData);
      if (result.success) {
        // ส่งแจ้งเตือนผ่าน LINE
        const lineConfig = await getLineNotifyConfig(params.id);
        if (lineConfig.success && lineConfig.data) {
          await sendUtilityReadingNotification(
            lineConfig.data,
            room.number,
            type,
            0,
            0,
            0
          );
        }

        toast.success("รีเซ็ตค่ามิเตอร์เรียบร้อย");
        loadInitialData();
      }
    } catch (error) {
      console.error("Error resetting utility reading:", error);
      toast.error("เกิดข้อผิดพลาดในการรีเซ็ตค่ามิเตอร์");
    }
  };

  const getLatestReading = (roomId: string, type: "water" | "electric") => {
    return readings
      .filter((r) => r.roomId === roomId && r.type === type)
      .sort((a, b) => b.readingDate.getTime() - a.readingDate.getTime())[0];
  };

  const filteredRooms = rooms.filter((room) => {
    if (!searchTerm) return true;
    return room.number.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          บันทึกค่ามิเตอร์น้ำ/ไฟ
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  รายการห้องพัก
                </h2>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาตามเลขห้อง..."
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-10"
                  />
                  <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ห้อง
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        มิเตอร์น้ำล่าสุด
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        มิเตอร์ไฟล่าสุด
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRooms.map((room) => {
                      const waterReading = getLatestReading(room.id, "water");
                      const electricReading = getLatestReading(
                        room.id,
                        "electric"
                      );
                      return (
                        <tr key={room.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ห้อง {room.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {waterReading ? (
                              <div>
                                <div>{waterReading.currentReading}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(
                                    waterReading.readingDate
                                  ).toLocaleDateString("th-TH")}
                                </div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {electricReading ? (
                              <div>
                                <div>{electricReading.currentReading}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(
                                    electricReading.readingDate
                                  ).toLocaleDateString("th-TH")}
                                </div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedRoom(room.id);
                                  setFormData({ currentReading: "" });
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                บันทึกค่ามิเตอร์
                              </button>
                              <button
                                onClick={() => handleResetReading(room.id, "water")}
                                className="text-red-600 hover:text-red-900"
                              >
                                รีเซ็ตน้ำ
                              </button>
                              <button
                                onClick={() => handleResetReading(room.id, "electric")}
                                className="text-red-600 hover:text-red-900"
                              >
                                รีเซ็ตไฟ
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {selectedRoom && (
          <div>
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                บันทึกค่ามิเตอร์
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ห้อง
                  </label>
                  <div className="text-sm text-gray-900">
                    ห้อง{" "}
                    {rooms.find((r) => r.id === selectedRoom)?.number || "-"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ประเภท
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) =>
                      setSelectedType(e.target.value as "water" | "electric")
                    }
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="water">มิเตอร์น้ำ</option>
                    <option value="electric">มิเตอร์ไฟ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค่ามิเตอร์ล่าสุด
                  </label>
                  <div className="text-sm text-gray-900">
                    {getLatestReading(selectedRoom, selectedType)
                      ?.currentReading || 0}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค่ามิเตอร์ใหม่
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.currentReading}
                    onChange={(e) =>
                      setFormData({ currentReading: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRoom("")}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    บันทึก
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 