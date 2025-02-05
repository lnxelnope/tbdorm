"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, AlertTriangle, Edit2, Check, X, Search, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Dormitory, Room, UtilityReading } from "@/types/dormitory";
import { queryDormitories, getRooms, getUtilityReadings, addUtilityReading } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";

interface ReadingFormData {
  currentReading: string;
  isBilled: boolean;
  billId?: string;
}

interface RoomReadingData {
  [key: string]: ReadingFormData;
}

export default function MeterReadingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState<Dormitory | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [currentReadings, setCurrentReadings] = useState<Record<string, string>>({});
  const [previousReadings, setPreviousReadings] = useState<Record<string, number>>({});
  const [savingRoom, setSavingRoom] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [lastSavedReadings, setLastSavedReadings] = useState<Record<string, number>>({});
  const [readingData, setReadingData] = useState<RoomReadingData>({});
  const [fraudThreshold, setFraudThreshold] = useState<string>("10");

  useEffect(() => {
    loadDormitories();
  }, []);

  useEffect(() => {
    if (selectedDormitory) {
      loadRoomsAndReadings();
    }
  }, [selectedDormitory]);

  const loadDormitories = async () => {
    try {
      setIsLoading(true);
      const result = await queryDormitories();
      if (result.success && result.data) {
        setDormitories(result.data);
        if (result.data.length > 0) {
          setSelectedDormitory(result.data[0]);
        }
      }
    } catch (error) {
      console.error("Error loading dormitories:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoomsAndReadings = async () => {
    if (!selectedDormitory) return;
    try {
      setIsLoading(true);
      const [roomsResult, readingsResult] = await Promise.all([
        getRooms(selectedDormitory.id),
        getUtilityReadings(selectedDormitory.id)
      ]);

      if (roomsResult.success && roomsResult.data) {
        setRooms(roomsResult.data);
      }

      if (readingsResult.success && readingsResult.data) {
        const latestReadings = readingsResult.data.filter(r => r.type === "electric");
        setReadings(latestReadings);

        // สร้าง readingData จากค่าที่บันทึกไว้ที่ยังไม่ได้ออกบิล
        const newReadingData: RoomReadingData = {};
        latestReadings.forEach(reading => {
          if (!reading.isBilled) {
            newReadingData[reading.roomId] = {
              currentReading: reading.currentReading.toString(),
              isBilled: false,
              billId: reading.billId
            };
          }
        });
        setReadingData(newReadingData);
      }
    } catch (error) {
      console.error("Error loading rooms and readings:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    const formData = readingData[roomId];
    if (!formData?.currentReading) {
      toast.error("กรุณากรอกค่ามิเตอร์");
      return;
    }

    const currentReading = parseFloat(formData.currentReading);
    const previousReading = getLatestReading(roomId)?.currentReading || room.initialMeterReading || 0;

    if (currentReading < previousReading) {
      toast.error("ค่ามิเตอร์ใหม่ต้องมากกว่าค่าเดิม");
      return;
    }

    try {
      const readingData: Omit<UtilityReading, "id" | "createdAt"> = {
        roomId: roomId,
        dormitoryId: selectedDormitory?.id || "",
        type: "electric",
        previousReading,
        currentReading,
        readingDate: new Date(),
        units: currentReading - previousReading,
        createdBy: "admin",
        isBilled: false
      };

      const result = await addUtilityReading(selectedDormitory?.id || "", readingData);
      if (result.success) {
        toast.success("บันทึกค่ามิเตอร์เรียบร้อย");
        loadRoomsAndReadings(); // โหลดข้อมูลใหม่
      }
    } catch (error) {
      console.error("Error saving reading:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const getLatestReading = (roomId: string) => {
    // เรียงลำดับตามวันที่จากใหม่ไปเก่า
    const roomReadings = readings
      .filter((r) => r.roomId === roomId)
      .sort((a, b) => {
        const dateA = a.readingDate instanceof Date ? a.readingDate : new Date(a.readingDate);
        const dateB = b.readingDate instanceof Date ? b.readingDate : new Date(b.readingDate);
        return dateB.getTime() - dateA.getTime();
      });

    // ค่าล่าสุดที่ยังไม่ได้ออกบิล (ถ้ามี) จะใช้เป็นค่าเดือนนี้
    const currentMonthReading = roomReadings.find(r => !r.isBilled);
    
    // ค่าล่าสุดที่ออกบิลแล้ว (ถ้ามี) จะใช้เป็นค่าเดือนก่อน
    const previousMonthReading = roomReadings.find(r => r.isBilled);

    return {
      currentReading: currentMonthReading?.currentReading || null,
      previousReading: previousMonthReading?.currentReading || null
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, roomId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(roomId);
    }
  };

  const handleEdit = (roomId: string) => {
    setEditingRoom(roomId);
    setEditValue(previousReadings[roomId]?.toString() || "");
  };

  const handleCancelEdit = () => {
    setEditingRoom(null);
    setEditValue("");
  };

  const handleSaveEdit = async (roomId: string) => {
    if (!selectedDormitory) return;
    if (!editValue) {
      toast.error("กรุณากรอกค่ามิเตอร์");
      return;
    }

    const reading = parseFloat(editValue);
    if (isNaN(reading) || reading < 0) {
      toast.error("กรุณากรอกค่ามิเตอร์ให้ถูกต้อง");
      return;
    }

    try {
      setSavingRoom(roomId);
      const readingData: Omit<UtilityReading, "id" | "createdAt"> = {
        roomId,
        dormitoryId: selectedDormitory.id,
        type: "electric",
        previousReading: previousReadings[roomId] || 0,
        currentReading: reading,
        readingDate: new Date(),
        units: reading - (previousReadings[roomId] || 0),
        isBilled: false,
        createdBy: "admin"
      };

      const result = await addUtilityReading(selectedDormitory.id, readingData);
      if (result.success) {
        toast.success("แก้ไขค่ามิเตอร์เรียบร้อย");
        // อัพเดทค่าเก่าเป็นค่าที่แก้ไข
        setPreviousReadings(prev => ({
          ...prev,
          [roomId]: reading
        }));
        setEditingRoom(null);
        setEditValue("");
        loadRoomsAndReadings(); // โหลดข้อมูลใหม่
      }
    } catch (error) {
      console.error("Error updating meter reading:", error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    } finally {
      setSavingRoom(null);
    }
  };

  // ฟังก์ชันสำหรับเรียงลำดับห้อง
  const sortRooms = (rooms: Room[]) => {
    return [...rooms].sort((a, b) => {
      const aNum = parseInt(a.number);
      const bNum = parseInt(b.number);
      if (isNaN(aNum) || isNaN(bNum)) {
        return sortOrder === "asc" 
          ? a.number.localeCompare(b.number)
          : b.number.localeCompare(a.number);
      }
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    });
  };

  // ฟังก์ชันสำหรับกรองห้องตามคำค้นหา
  const filterRooms = (rooms: Room[]) => {
    if (!searchTerm) return rooms;
    return rooms.filter(room => 
      room.number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // ฟังก์ชันสำหรับสลับการเรียงลำดับ
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  const getStatusText = (roomId: string) => {
    const reading = readingData[roomId];
    if (!reading || !reading.currentReading) {
      return "รอจดมิเตอร์";
    }
    if (reading.isBilled) {
      return "ออกบิลแล้ว";
    }
    return "รอออกบิล";
  };

  const getStatusStyle = (roomId: string) => {
    const reading = readingData[roomId];
    if (!reading || !reading.currentReading) {
      return "bg-gray-100 text-gray-800";
    }
    if (reading.isBilled) {
      return "bg-green-100 text-green-800";
    }
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 mr-4">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            บันทึกค่ามิเตอร์ไฟฟ้า
          </h1>
        </div>
        {dormitories.length > 0 && (
          <select
            value={selectedDormitory?.id || ""}
            onChange={(e) => {
              const dormitory = dormitories.find(d => d.id === e.target.value);
              setSelectedDormitory(dormitory || null);
            }}
            className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {dormitories.map((dormitory) => (
              <option key={dormitory.id} value={dormitory.id}>
                {dormitory.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* แถบค้นหาและเรียงลำดับ */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาห้อง..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">ค่าไฟห้องว่างเกิน:</label>
          <input
            type="number"
            value={fraudThreshold}
            onChange={(e) => setFraudThreshold(e.target.value)}
            className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            min="0"
            step="0.01"
          />
          <span className="text-sm text-gray-700">หน่วย</span>
        </div>
      </div>

      {/* แถบช่วยเหลือ */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">คำแนะนำการจดมิเตอร์</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>ตรวจสอบเลขห้องให้ตรงกับมิเตอร์ที่กำลังจด</li>
                <li>ค่ามิเตอร์ใหม่ต้องมากกว่าค่าเดือนก่อน</li>
                <li>หน่วยที่ใช้จะคำนวณให้อัตโนมัติ</li>
                <li>สามารถแก้ไขค่าที่จดผิดได้โดยกดปุ่มแก้ไข</li>
                <li>กดปุ่มบันทึกหลังจากตรวจสอบความถูกต้องแล้ว</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center">กำลังโหลด...</div>
      ) : !selectedDormitory ? (
        <div className="text-center">ไม่พบข้อมูลหอพัก</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">รายการห้อง</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={toggleSortOrder}
                    >
                      <div className="flex items-center">
                        ห้อง
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                        <span className="ml-1 text-xs">
                          ({sortOrder === "asc" ? "น้อยไปมาก" : "มากไปน้อย"})
                        </span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เดือนก่อน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เดือนนี้
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หน่วยที่ใช้
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortRooms(filterRooms(rooms)).map((room) => {
                    const readings = getLatestReading(room.id);
                    const previousReading = readings.previousReading || room.initialMeterReading || 0;
                    const currentReading = readingData[room.id]?.currentReading || readings.currentReading?.toString() || "";
                    const units = currentReading ? parseFloat(currentReading) - previousReading : null;
                    const isBilled = readingData[room.id]?.isBilled || false;
                    const isHighUsage = units !== null && units > 200;
                    const isVacantHighUsage = room.status === 'available' && units !== null && units > parseFloat(fraudThreshold);
                    const isEditing = editingRoom === room.id;
                    return (
                      <tr key={room.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ห้อง {room.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEdit(room.id);
                                  }
                                }}
                                className="block w-24 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="0.00"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(room.id)}
                                disabled={savingRoom === room.id}
                                className="inline-flex items-center p-1 border border-transparent rounded-md text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="inline-flex items-center p-1 border border-transparent rounded-md text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>{previousReading.toFixed(2)}</span>
                              <button
                                onClick={() => handleEdit(room.id)}
                                className="inline-flex items-center p-1 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                title="เปลี่ยนแปลงค่ามิเตอร์"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {!isBilled ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={currentReading}
                                onChange={(e) => {
                                  // อนุญาตเฉพาะตัวเลขและจุดทศนิยม
                                  const value = e.target.value.replace(/[^0-9.]/g, '');
                                  setReadingData(prev => ({
                                    ...prev,
                                    [room.id]: {
                                      ...prev[room.id],
                                      currentReading: value
                                    }
                                  }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSubmit(room.id);
                                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    const currentIndex = rooms.findIndex(r => r.id === room.id);
                                    let nextIndex;
                                    if (e.key === 'ArrowUp') {
                                      nextIndex = currentIndex > 0 ? currentIndex - 1 : rooms.length - 1;
                                    } else {
                                      nextIndex = currentIndex < rooms.length - 1 ? currentIndex + 1 : 0;
                                    }
                                    const nextRoom = rooms[nextIndex];
                                    if (nextRoom) {
                                      const nextInput = document.querySelector(`input[data-room-id="${nextRoom.id}"]`) as HTMLInputElement;
                                      if (nextInput) {
                                        nextInput.focus();
                                      }
                                    }
                                  }
                                }}
                                data-room-id={room.id}
                                className="block w-24 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="0.00"
                              />
                              {!isBilled && (
                                <button
                                  onClick={() => handleSubmit(room.id)}
                                  disabled={savingRoom === room.id || isEditing}
                                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                  {savingRoom === room.id ? (
                                    "กำลังบันทึก..."
                                  ) : (
                                    <>
                                      <Save className="h-4 w-4 mr-1" />
                                      บันทึก
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span>{currentReading}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {units !== null && (
                            <span className={`font-medium ${isHighUsage ? 'text-red-600' : isVacantHighUsage ? 'text-orange-600' : 'text-gray-900'}`}>
                              {units.toFixed(2)} หน่วย
                              {isHighUsage && (
                                <span className="ml-2 text-xs text-red-600">
                                  (ใช้ไฟสูงผิดปกติ)
                                </span>
                              )}
                              {isVacantHighUsage && (
                                <span className="ml-2 text-xs text-orange-600">
                                  (ห้องว่างใช้ไฟผิดปกติ)
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(room.id)}`}>
                            {getStatusText(room.id)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* แสดงข้อความเมื่อไม่พบห้องที่ค้นหา */}
              {filterRooms(rooms).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  ไม่พบห้องที่ค้นหา
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 