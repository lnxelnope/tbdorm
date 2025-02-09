 "use client";

import { useState, useEffect } from "react";
import { queryDormitories, getRooms, saveMeterReading, getLatestMeterReading, queryTenants } from "@/lib/firebase/firebaseUtils";
import { Dormitory, Room, MeterReading } from "@/types/dormitory";
import { toast } from "sonner";
import { Plus, Search, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// เพิ่ม interface สำหรับการเรียงข้อมูล
interface SortConfig {
  key: 'number' | 'dormitoryName' | 'tenantName' | 'previousReading' | 'currentReading' | 'unitsUsed';
  direction: 'asc' | 'desc';
}

export default function MeterReadingPage() {
  const [selectedDormitory, setSelectedDormitory] = useState<string>("");
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // ค่ามิเตอร์
  const [meterReadings, setMeterReadings] = useState<Record<string, number>>({});
  const [previousReadings, setPreviousReadings] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingRoom, setSavingRoom] = useState<string | null>(null);

  // เพิ่ม state สำหรับการเรียงข้อมูล
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'number',
    direction: 'asc'
  });

  // เพิ่ม state สำหรับเก็บข้อมูลผู้เช่า
  const [tenants, setTenants] = useState<Record<string, string>>({});  // roomNumber -> tenantName

  // โหลดข้อมูลหอพัก
  useEffect(() => {
    const loadDormitories = async () => {
      try {
        const result = await queryDormitories();
        if (result.success) {
          setDormitories(result.data);
          // ถ้ามีหอพัก ให้เลือกหอพักแรกเป็นค่าเริ่มต้น
          if (result.data.length > 0) {
            setSelectedDormitory(result.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading dormitories:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก');
      }
    };
    loadDormitories();
  }, []);

  // โหลดข้อมูลห้องเมื่อเลือกหอพัก
  useEffect(() => {
    const loadRooms = async () => {
      if (!selectedDormitory) return;
      
      try {
        setIsLoading(true);
        const [roomsResult, tenantsResult] = await Promise.all([
          getRooms(selectedDormitory),
          queryTenants(selectedDormitory)
        ]);

        if (roomsResult.success) {
          // เรียงลำดับห้องตามเลขห้อง
          const sortedRooms = roomsResult.data.sort((a, b) => {
            const roomA = parseInt(a.number.replace(/\D/g, ''));
            const roomB = parseInt(b.number.replace(/\D/g, ''));
            return roomA - roomB;
          });
          
          setRooms(sortedRooms);

          // สร้าง map ของผู้เช่า
          if (tenantsResult.success) {
            const tenantMap: Record<string, string> = {};
            tenantsResult.data.forEach(tenant => {
              tenantMap[tenant.roomNumber] = tenant.name;
            });
            setTenants(tenantMap);
          }
          
          // โหลดค่ามิเตอร์ล่าสุดของแต่ละห้อง
          const readings: Record<string, number> = {};
          const prevReadings: Record<string, number> = {};
          
          for (const room of sortedRooms) {
            const meterResult = await getLatestMeterReading(selectedDormitory, room.id, 'electric');
            if (meterResult.success && meterResult.data) {
              readings[room.id] = meterResult.data.currentReading;
              prevReadings[room.id] = meterResult.data.previousReading;
            } else {
              // ถ้าไม่มีค่ามิเตอร์ล่าสุด ใช้ค่าเริ่มต้นจากห้อง
              readings[room.id] = room.initialMeterReading || 0;
              prevReadings[room.id] = room.initialMeterReading || 0;
            }
          }
          
          setMeterReadings(readings);
          setPreviousReadings(prevReadings);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRooms();
  }, [selectedDormitory]);

  // กรองห้องตามการค้นหา
  const filteredRooms = rooms.filter(room => {
    if (!searchQuery) return true;
    return (
      room.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.tenantName && room.tenantName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // ฟังก์ชันสำหรับเรียงข้อมูล
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // ฟังก์ชันสำหรับแสดงไอคอนการเรียง
  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // เรียงข้อมูลตาม sortConfig
  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    
    switch (sortConfig.key) {
      case 'number':
        const roomA = parseInt(a.number.replace(/\D/g, ''));
        const roomB = parseInt(b.number.replace(/\D/g, ''));
        return (roomA - roomB) * direction;
      
      case 'dormitoryName':
        const dormA = dormitories.find(d => d.id === a.dormitoryId)?.name || '';
        const dormB = dormitories.find(d => d.id === b.dormitoryId)?.name || '';
        return dormA.localeCompare(dormB) * direction;
      
      case 'tenantName':
        const nameA = a.tenantName || '';
        const nameB = b.tenantName || '';
        return nameA.localeCompare(nameB) * direction;
      
      case 'previousReading':
        const prevA = previousReadings[a.id] || 0;
        const prevB = previousReadings[b.id] || 0;
        return (prevA - prevB) * direction;
      
      case 'currentReading':
        const currA = meterReadings[a.id] || 0;
        const currB = meterReadings[b.id] || 0;
        return (currA - currB) * direction;
      
      case 'unitsUsed':
        const unitsA = (meterReadings[a.id] || 0) - (previousReadings[a.id] || 0);
        const unitsB = (meterReadings[b.id] || 0) - (previousReadings[b.id] || 0);
        return (unitsA - unitsB) * direction;
      
      default:
        return 0;
    }
  });

  // บันทึกค่ามิเตอร์
  const handleSave = async (roomId: string, currentReading: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const previousReading = previousReadings[roomId] || 0;
    
    try {
      setSavingRoom(room.number);
      
      const result = await saveMeterReading(selectedDormitory, {
        roomId,
        previousReading,
        currentReading,
        readingDate: new Date().toISOString(),
        type: 'electric'
      });

      if (result.success) {
        setMeterReadings(prev => ({ ...prev, [roomId]: currentReading }));
        toast.success(`บันทึกค่ามิเตอร์ห้อง ${room.number} เรียบร้อย`);
      } else {
        setErrors(prev => ({ ...prev, [roomId]: result.error || 'เกิดข้อผิดพลาดในการบันทึก' }));
      }
    } catch (error) {
      console.error('Error saving meter reading:', error);
      setErrors(prev => ({ ...prev, [roomId]: 'เกิดข้อผิดพลาดในการบันทึก' }));
    } finally {
      setSavingRoom(null);
    }
  };

  // ฟังก์ชันสำหรับย้ายไปช่องถัดไป
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = document.querySelectorAll<HTMLInputElement>('input[type="number"]');
      const nextInput = inputs[currentIndex + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>จดมิเตอร์ไฟ</CardTitle>
              <CardDescription>บันทึกค่ามิเตอร์ไฟฟ้าของแต่ละห้อง</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="dormitory" className="block text-sm font-medium text-gray-700 mb-1">
                  หอพัก
                </label>
                <select
                  id="dormitory"
                  value={selectedDormitory}
                  onChange={(e) => setSelectedDormitory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">เลือกหอพัก</option>
                  {dormitories.map((dormitory) => (
                    <option key={dormitory.id} value={dormitory.id}>
                      {dormitory.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  ค้นหา
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="ค้นหาด้วยเลขห้อง หรือชื่อผู้เช่า"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('number')}
                    >
                      เลขห้อง {getSortIcon('number')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('dormitoryName')}
                    >
                      หอพัก {getSortIcon('dormitoryName')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('tenantName')}
                    >
                      ผู้เช่า {getSortIcon('tenantName')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('previousReading')}
                    >
                      ค่ามิเตอร์ครั้งก่อน {getSortIcon('previousReading')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('currentReading')}
                    >
                      ค่ามิเตอร์ครั้งนี้ {getSortIcon('currentReading')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('unitsUsed')}
                    >
                      จำนวนหน่วยที่ใช้ {getSortIcon('unitsUsed')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedRooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    sortedRooms.map((room, index) => {
                      const previousReading = previousReadings[room.id] || 0;
                      const currentReading = meterReadings[room.id] || '';
                      const unitsUsed = currentReading ? parseFloat(currentReading.toString()) - previousReading : 0;
                      const dormitory = dormitories.find(d => d.id === room.dormitoryId);

                      return (
                        <tr key={room.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {room.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dormitory?.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tenants[room.number] || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {previousReading}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative space-y-1">
                              <input
                                type="number"
                                value={currentReading}
                                onChange={(e) => setMeterReadings(prev => ({
                                  ...prev,
                                  [room.id]: parseFloat(e.target.value)
                                }))}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onBlur={(e) => {
                                  if (e.target.value) {
                                    handleSave(room.id, parseFloat(e.target.value));
                                  }
                                }}
                                min={previousReading}
                                className={cn(
                                  "block w-32 rounded-md border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors",
                                  errors[room.id] ? "border-red-500 bg-red-50" : "border-gray-300"
                                )}
                                placeholder="กรอกค่ามิเตอร์"
                                disabled={savingRoom === room.number}
                              />
                              {savingRoom === room.number && (
                                <div className="absolute right-2 top-2.5">
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                </div>
                              )}
                              {errors[room.id] && (
                                <p className="text-xs text-red-500">{errors[room.id]}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {unitsUsed > 0 ? unitsUsed.toFixed(2) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
