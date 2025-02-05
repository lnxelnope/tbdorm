"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Room, UtilityReading } from "@/types/dormitory";
import { getRooms, getUtilityReadings } from "@/lib/firebase/firebaseUtils";
import Link from "next/link";
import { toast } from "sonner";

export default function UtilityHistoryPage({
  params,
}: {
  params: { id: string };
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"water" | "electric">("water");
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

  const filteredRooms = rooms.filter((room) => {
    if (!searchTerm) return true;
    return room.number.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getReadingsForRoom = (roomId: string, type: "water" | "electric") => {
    return readings
      .filter((r) => r.roomId === roomId && r.type === type)
      .sort((a, b) => b.readingDate.getTime() - a.readingDate.getTime());
  };

  const calculateAverageUnits = (roomId: string, type: "water" | "electric") => {
    const roomReadings = getReadingsForRoom(roomId, type);
    if (roomReadings.length === 0) return 0;
    const totalUnits = roomReadings.reduce((sum, r) => sum + r.units, 0);
    return totalUnits / roomReadings.length;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link
          href={`/dormitories/${params.id}/utilities`}
          className="text-gray-500 hover:text-gray-700 mr-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          ประวัติการใช้น้ำ/ไฟ
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
                        ค่าเฉลี่ยน้ำ/เดือน
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ค่าเฉลี่ยไฟ/เดือน
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRooms.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ห้อง {room.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateAverageUnits(room.id, "water").toFixed(2)}{" "}
                          หน่วย
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateAverageUnits(room.id, "electric").toFixed(2)}{" "}
                          หน่วย
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedRoom(room.id);
                              setSelectedType("water");
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            ดูประวัติ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {selectedRoom && (
          <div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  ประวัติการใช้งาน
                </h2>
                <select
                  value={selectedType}
                  onChange={(e) =>
                    setSelectedType(e.target.value as "water" | "electric")
                  }
                  className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="water">มิเตอร์น้ำ</option>
                  <option value="electric">มิเตอร์ไฟ</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-gray-900">
                  ห้อง {rooms.find((r) => r.id === selectedRoom)?.number || "-"}
                </div>

                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        วันที่
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ค่าเก่า
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ค่าใหม่
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        หน่วยที่ใช้
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getReadingsForRoom(selectedRoom, selectedType).map(
                      (reading) => (
                        <tr key={reading.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {new Date(reading.readingDate).toLocaleDateString(
                              "th-TH"
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {reading.previousReading}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {reading.currentReading}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {reading.units}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 