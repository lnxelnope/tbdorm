"use client";

import { useState, useEffect, useCallback } from "react";
import { queryDormitories, getRooms, saveMeterReading, getLatestMeterReading, queryTenants } from "@/lib/firebase/firebaseUtils";
import { Dormitory, Room, MeterReading } from "@/types/dormitory";
import { toast } from "sonner";
import { Plus, Search, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import debounce from 'lodash/debounce';

// เพิ่ม interface สำหรับการเรียงข้อมูล
interface SortConfig {
  key: 'number' | 'dormitoryName' | 'tenantName' | 'previousReading' | 'currentReading' | 'unitsUsed';
  direction: 'asc' | 'desc';
}

interface BillValidation {
  canGenerate: boolean;
  message?: string;
}

// เพิ่ม interface สำหรับเก็บข้อมูลมิเตอร์
interface MeterData {
  currentReading: number;
  previousReading: number;
  unitsUsed: number;
  readingDate: string;
}

const canGenerateBill = (
  room: Room,
  previousReading: number,
  currentReading: number
): BillValidation => {
  // 1. ตรวจสอบค่ามิเตอร์
  if (currentReading <= previousReading) {
    return {
      canGenerate: false,
      message: "ค่ามิเตอร์ปัจจุบันต้องมากกว่าครั้งก่อน"
    };
  }

  // 2. ตรวจสอบสถานะห้อง
  if (!room.tenantId) {
    return {
      canGenerate: false,
      message: "ไม่มีผู้เช่าในห้องนี้"
    };
  }

  if (room.status === 'moving_out') {
    return {
      canGenerate: false,
      message: "ห้องอยู่ในสถานะแจ้งย้ายออก"
    };
  }

  // ผ่านทุกเงื่อนไข
  return {
    canGenerate: true
  };
};

interface MeterReadingRowProps {
  roomNumber: string;
  previousReading: number;
  unitsUsed?: number;
  onSave: (currentReading: number) => void;
}

function MeterReadingRow({ roomNumber, previousReading, unitsUsed, onSave }: MeterReadingRowProps) {
  const [currentReading, setCurrentReading] = useState<string>('');
  
  return (
    <div className="flex items-center gap-4 py-2 border-b">
      <div className="w-32">
        <label className="block text-sm font-medium text-gray-700">
          {roomNumber}
        </label>
      </div>

      <div className="w-32">
        <label className="block text-sm text-gray-600">
          {previousReading}
        </label>
      </div>

      <div className="w-32">
        <input
          type="number"
          value={currentReading}
          onChange={(e) => setCurrentReading(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="ค่ามิเตอร์ปัจจุบัน"
        />
      </div>

      {/* ถ้ามี unitsUsed แล้วให้แสดงปุ่มแก้ไข ถ้าไม่มีให้แสดงปุ่มบันทึก */}
      {unitsUsed ? (
        <button
          onClick={() => onSave(Number(currentReading))}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          แก้ไข
        </button>
      ) : (
        <button
          onClick={() => onSave(Number(currentReading))}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          บันทึก
        </button>
      )}

      {/* แสดงจำนวนหน่วยที่ใช้ถ้ามีข้อมูล */}
      {unitsUsed && (
        <div className="w-32 text-right">
          <span className="text-sm text-gray-600">{unitsUsed}</span>
        </div>
      )}
    </div>
  );
}

export default function MeterReadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [selectedDormitory, setSelectedDormitory] = useState<string>("");
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // เพิ่ม state สำหรับ errors และ savingRoom
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingRoom, setSavingRoom] = useState<string | null>(null);
  
  // เพิ่ม interface สำหรับเก็บข้อมูลมิเตอร์
  const [meterData, setMeterData] = useState<Record<string, MeterData>>({});

  // เพิ่ม state สำหรับการเรียงข้อมูล
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'number',
    direction: 'asc'
  });

  // เพิ่ม state สำหรับเก็บข้อมูลผู้เช่า
  const [tenants, setTenants] = useState<Record<string, string>>({});  // roomNumber -> tenantName

  // สร้าง debounced function
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setDebouncedSearchTerm(term);
      // อัพเดท URL
      const params = new URLSearchParams(searchParams);
      params.set('search', term);
      router.replace(`/dormitories/meter-reading?${params.toString()}`);
    }, 500), // รอ 500ms หลังจากพิมพ์เสร็จ
    [searchParams, router]
  );

  // เมื่อ searchTerm เปลี่ยน
  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

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
          const sortedRooms = roomsResult.data.sort((a, b) => {
            const roomA = parseInt(a.number.replace(/\D/g, ''));
            const roomB = parseInt(b.number.replace(/\D/g, ''));
            return roomA - roomB;
          });
          
          // กรองห้องตาม debouncedSearchTerm
          const filteredRooms = debouncedSearchTerm 
            ? sortedRooms.filter(room => 
                room.number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (room.tenantName && room.tenantName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
              )
            : sortedRooms;
          
          setRooms(filteredRooms);

          // สร้าง map ของผู้เช่า
          if (tenantsResult.success) {
            const tenantMap: Record<string, string> = {};
            tenantsResult.data.forEach(tenant => {
              tenantMap[tenant.roomNumber] = tenant.name;
            });
            setTenants(tenantMap);
          }
          
          // โหลดค่ามิเตอร์ล่าสุดของแต่ละห้อง
          const meterDataMap: Record<string, MeterData> = {};
          
          for (const room of filteredRooms) {
            const meterResult = await getLatestMeterReading(selectedDormitory, room.number, 'electric');
            if (meterResult.success && meterResult.data) {
              meterDataMap[room.id] = {
                currentReading: meterResult.data.currentReading,
                previousReading: meterResult.data.previousReading,
                unitsUsed: meterResult.data.unitsUsed,
                readingDate: meterResult.data.readingDate
              };
            } else {
              meterDataMap[room.id] = {
                currentReading: room.initialMeterReading || 0,
                previousReading: room.initialMeterReading || 0,
                unitsUsed: 0,
                readingDate: new Date().toISOString()
              };
            }
          }
          
          setMeterData(meterDataMap);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRooms();
  }, [selectedDormitory, debouncedSearchTerm]);

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
  const sortedRooms = [...rooms].sort((a, b) => {
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
        const prevA = meterData[a.id]?.previousReading || 0;
        const prevB = meterData[b.id]?.previousReading || 0;
        return (prevA - prevB) * direction;
      
      case 'currentReading':
        const currA = meterData[a.id]?.currentReading || 0;
        const currB = meterData[b.id]?.currentReading || 0;
        return (currA - currB) * direction;
      
      case 'unitsUsed':
        const unitsA = (meterData[a.id]?.unitsUsed || 0) - (meterData[a.id]?.previousReading || 0);
        const unitsB = (meterData[b.id]?.unitsUsed || 0) - (meterData[b.id]?.previousReading || 0);
        return (unitsA - unitsB) * direction;
      
      default:
        return 0;
    }
  });

  // บันทึกค่ามิเตอร์
  const handleSave = async (roomId: string, currentReading: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const previousReading = meterData[roomId]?.previousReading || 0;
    
    try {
      setSavingRoom(room.number);
      
      // คำนวณ unitsUsed ก่อนบันทึก
      const unitsUsed = currentReading - previousReading;

      // ตรวจสอบค่าที่จะบันทึก
      console.log('Saving meter reading:', {
        roomId,
        roomNumber: room.number,
        previousReading,
        currentReading,
        unitsUsed,
        readingDate: new Date().toISOString()
      });
      
      const result = await saveMeterReading(selectedDormitory, {
        roomId,
        roomNumber: room.number,
        previousReading,
        currentReading,
        unitsUsed, // ส่ง unitsUsed ไปด้วย
        readingDate: new Date().toISOString(),
        type: 'electric'
      });

      if (result.success) {
        // !!! IMPORTANT: ห้ามอัพเดท previousReadings ตรงนี้ !!!
        // เพราะจะทำให้ค่า unitsUsed เป็น 0 เสมอ (currentReading - previousReading = 0)
        setMeterData(prev => ({ ...prev, [roomId]: { ...prev[roomId], currentReading, unitsUsed } }));
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

  // ตัวอย่างการใช้งาน
  const handleGenerateBill = (room: Room) => {
    const validation = canGenerateBill(
      room,
      meterData[room.id]?.previousReading || 0,
      meterData[room.id]?.currentReading || 0
    );

    if (!validation.canGenerate) {
      toast.error(validation.message);
      return;
    }

    // ดำเนินการสร้างบิล
    // ...
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
            <div className="w-72">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาตามเลขห้อง"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border border-gray-300 py-2 text-sm"
                />
              </div>
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
                  {sortedRooms
                    .filter(room => 
                      room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (room.tenantName && room.tenantName.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((room, index) => {
                      const meter = meterData[room.id];
                      const previousReading = meter?.previousReading || 0;
                      const currentReading = meter?.currentReading || '';
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
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={currentReading}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    setMeterData(prev => ({
                                      ...prev,
                                      [room.id]: {
                                        ...prev[room.id],
                                        currentReading: value,
                                        unitsUsed: value - (prev[room.id]?.previousReading || 0)
                                      }
                                    }));
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, index)}
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
                              <button
                                onClick={() => {
                                  if (currentReading) {
                                    handleSave(room.id, parseFloat(currentReading.toString()));
                                  }
                                }}
                                disabled={savingRoom === room.number || !currentReading}
                                className={cn(
                                  "px-3 py-2 rounded-md text-sm font-medium flex items-center",
                                  currentReading && !savingRoom
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                )}
                              >
                                {savingRoom === room.number ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                                <span className="ml-1">บันทึก</span>
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {previousReading}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <span className={cn(
                                "font-medium",
                                meter?.unitsUsed > 0 ? "text-blue-600" : "text-gray-500"
                              )}>
                                {meter?.unitsUsed > 0 ? meter.unitsUsed.toFixed(2) : '-'}
                              </span>
                              {meter?.readingDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  บันทึกเมื่อ: {new Date(meter.readingDate).toLocaleDateString('th-TH')}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
