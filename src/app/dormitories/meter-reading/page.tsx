"use client";

import { useState, useEffect } from "react";
import { queryDormitories, getRooms } from "@/lib/firebase/firebaseUtils";
import { saveMeterReading, getLatestMeterReading } from "@/lib/firebase/firebaseUtils";
import { Dormitory, Room } from "@/types/dormitory";
import { Plus, Search, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MeterReading {
  id: string;
  roomId: string;
  previousReading: number;
  currentReading: number;
  readingDate: string;
  type: 'electric' | 'water';
  unitsUsed: number;
  createdAt: any;
  updatedAt: any;
}

export default function MeterReadingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState<string>("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [meterReadings, setMeterReadings] = useState<Record<string, number>>({});
  const [previousReadings, setPreviousReadings] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingRoom, setSavingRoom] = useState<string | null>(null);
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingReadings, setIsLoadingReadings] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const [unsavedReadings, setUnsavedReadings] = useState<Record<string, number>>({});

  // แยกฟังก์ชันโหลดข้อมูลห้องและค่ามิเตอร์ออกมา
  const loadRoomsAndReadings = async (dormitoryId: string) => {
    if (!dormitoryId) return;

    try {
      setIsLoadingReadings(true);
      const result = await getRooms(dormitoryId);
      if (result.success && result.data) {
        // เรียงลำดับห้องตามเลขห้อง
        const sortedRooms = result.data.sort((a, b) => {
          const aNum = parseInt(a.number.replace(/\D/g, ''));
          const bNum = parseInt(b.number.replace(/\D/g, ''));
          return aNum - bNum;
        });
        setRooms(sortedRooms);
        
        // โหลดค่ามิเตอร์ล่าสุดของแต่ละห้อง
        const readings: Record<string, number> = {};
        const currentReadings: Record<string, number> = {};
        const failedRooms: string[] = []; // เก็บรายการห้องที่โหลดไม่สำเร็จ
        
        for (const room of sortedRooms) {
          try {
            const readingResult = await getLatestMeterReading(dormitoryId, room.id, 'electric');
            if (readingResult.success && readingResult.data) {
              const latestReading = readingResult.data as MeterReading;
              readings[room.id] = latestReading.currentReading;
              currentReadings[room.id] = latestReading.currentReading;
            } else {
              readings[room.id] = room.initialMeterReading || 0;
              currentReadings[room.id] = room.initialMeterReading || 0;
              failedRooms.push(room.number);
            }
          } catch (error) {
            console.error(`Error loading reading for room ${room.number}:`, error);
            readings[room.id] = room.initialMeterReading || 0;
            currentReadings[room.id] = room.initialMeterReading || 0;
            failedRooms.push(room.number);
          }
        }

        // แสดง error รวมทั้งหมดครั้งเดียว
        if (failedRooms.length > 0) {
          toast.error(`ไม่สามารถโหลดค่ามิเตอร์ของห้อง: ${failedRooms.join(', ')}`);
        }

        setPreviousReadings(readings);
        setMeterReadings(currentReadings);
      }
    } catch (error) {
      console.error("Error loading rooms:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลห้องพัก");
    } finally {
      setIsLoadingReadings(false);
    }
  };

  // โหลดข้อมูลหอพักทั้งหมด
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const result = await queryDormitories();
        if (result.success && result.data) {
          setDormitories(result.data);
          if (result.data.length > 0) {
            setSelectedDormitory(result.data[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading dormitories:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // โหลดข้อมูลห้องพักและค่ามิเตอร์เมื่อเลือกหอพัก
  useEffect(() => {
    loadRoomsAndReadings(selectedDormitory);
  }, [selectedDormitory]);

  // เพิ่ม effect สำหรับการบันทึกอัตโนมัติทุก 1 นาที
  useEffect(() => {
    if (!isModified || Object.keys(unsavedReadings).length === 0) return;

    const autoSaveInterval = setInterval(async () => {
      const now = new Date();
      if (!lastAutoSaveTime || (now.getTime() - lastAutoSaveTime.getTime()) >= 60000) { // 1 นาที
        console.log('กำลังบันทึกอัตโนมัติ...');
        await handleAutoSave();
      }
    }, 60000); // ตรวจสอบทุก 1 นาที

    return () => clearInterval(autoSaveInterval);
  }, [isModified, unsavedReadings, lastAutoSaveTime]);

  // เพิ่ม effect สำหรับการเตือนเมื่อมีการออกจากหน้า
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isModified && Object.keys(unsavedReadings).length > 0) {
        const message = "คุณยังไม่ได้บันทึกข้อมูล การออกจากหน้านี้อาจทำให้ข้อมูลสูญหาย";
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isModified, unsavedReadings]);

  // ฟังก์ชันสำหรับการบันทึกอัตโนมัติ
  const handleAutoSave = async () => {
    if (!isModified || Object.keys(unsavedReadings).length === 0) return;

    try {
      setIsSaving(true);
      const savePromises = Object.entries(unsavedReadings).map(([roomId, currentReading]) => 
        handleSaveRoom(roomId, currentReading)
      );
      
      await Promise.all(savePromises);
      setLastAutoSaveTime(new Date());
      setUnsavedReadings({});
      setIsModified(false);
      toast.success('บันทึกข้อมูลอัตโนมัติเรียบร้อย');
    } catch (error) {
      console.error('Error auto-saving:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกอัตโนมัติ');
    } finally {
      setIsSaving(false);
    }
  };

  const validateMeterReading = (value: string, previousReading: number): { isValid: boolean; error?: string } => {
    if (value === '') {
      return { isValid: false, error: 'กรุณากรอกค่ามิเตอร์' };
    }

    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return { isValid: false, error: 'กรุณากรอกตัวเลขเท่านั้น' };
    }

    if (numValue < 0) {
      return { isValid: false, error: 'ค่ามิเตอร์ต้องไม่ติดลบ' };
    }

    if (numValue <= previousReading) {
      return { isValid: false, error: `ค่ามิเตอร์ใหม่ต้องมากกว่า ${previousReading}` };
    }

    return { isValid: true };
  };

  const handleMeterReadingChange = (roomId: string, value: string) => {
    const previousReading = previousReadings[roomId] || 0;
    const validation = validateMeterReading(value, previousReading);

    // อัพเดทค่าที่กำลังพิมพ์ทันที
    const numValue = value === '' ? 0 : parseFloat(value);
    setMeterReadings(prev => ({
      ...prev,
      [roomId]: numValue
    }));

    // เก็บค่าที่ยังไม่ได้บันทึก
    setUnsavedReadings(prev => ({
      ...prev,
      [roomId]: numValue
    }));
    setIsModified(true);

    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        [roomId]: validation.error || ''
      }));
      return;
    }

    // ลบ error ถ้าค่าถูกต้อง
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[roomId];
      return newErrors;
    });

    // ยกเลิก timeout เดิม (ถ้ามี)
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }

    // ตั้งเวลาใหม่
    const timeoutId = setTimeout(() => {
      if (!errors[roomId]) { // บันทึกเฉพาะเมื่อไม่มี error
        handleSaveRoom(roomId, numValue);
      }
    }, 1500);
    
    setSaveTimeoutId(timeoutId);
  };

  const handleSaveRoom = async (roomId: string, currentReading: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      console.error('ไม่พบข้อมูลห้อง:', roomId);
      return;
    }

    const previousReading = previousReadings[roomId] || room.initialMeterReading || 0;
    
    // ตรวจสอบค่าอีกครั้งก่อนบันทึก
    const validation = validateMeterReading(currentReading.toString(), previousReading);
    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        [roomId]: validation.error || ''
      }));
      toast.error(`ห้อง ${room.number}: ${validation.error}`);
      return;
    }

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
        // อัพเดท state หลังบันทึกสำเร็จ
        setMeterReadings(prev => ({
          ...prev,
          [roomId]: currentReading
        }));
        setPreviousReadings(prev => ({
          ...prev,
          [roomId]: currentReading
        }));
        // ลบค่าที่บันทึกแล้วออกจาก unsavedReadings
        setUnsavedReadings(prev => {
          const newUnsaved = { ...prev };
          delete newUnsaved[roomId];
          return newUnsaved;
        });
        if (Object.keys(unsavedReadings).length === 0) {
          setIsModified(false);
        }
        toast.success(`บันทึกค่ามิเตอร์ห้อง ${room.number} เรียบร้อย`);
      } else {
        setErrors(prev => ({
          ...prev,
          [roomId]: result.error || 'เกิดข้อผิดพลาดในการบันทึก'
        }));
        toast.error(`ห้อง ${room.number}: ${result.error || 'เกิดข้อผิดพลาดในการบันทึก'}`);
      }
    } catch (error) {
      console.error(`Error saving meter reading for room ${room.number}:`, error);
      setErrors(prev => ({
        ...prev,
        [roomId]: 'เกิดข้อผิดพลาดในการบันทึก'
      }));
      toast.error(`เกิดข้อผิดพลาดในการบันทึกค่ามิเตอร์ห้อง ${room.number}`);
    } finally {
      setSavingRoom(null);
    }
  };

  // เพิ่มฟังก์ชันสำหรับบันทึกทั้งหมด
  const handleSaveAll = async () => {
    if (Object.keys(unsavedReadings).length === 0) {
      toast.info('ไม่มีข้อมูลที่ต้องบันทึก');
      return;
    }

    try {
      setIsSaving(true);
      const failedRooms: string[] = [];

      for (const [roomId, currentReading] of Object.entries(unsavedReadings)) {
        const room = rooms.find(r => r.id === roomId);
        if (!room) continue;

        const previousReading = previousReadings[roomId] || room.initialMeterReading || 0;
        const validation = validateMeterReading(currentReading.toString(), previousReading);

        if (!validation.isValid) {
          failedRooms.push(`${room.number} (${validation.error})`);
          continue;
        }

        try {
          const result = await saveMeterReading(selectedDormitory, {
            roomId,
            previousReading,
            currentReading,
            readingDate: new Date().toISOString(),
            type: 'electric'
          });

          if (result.success) {
            setMeterReadings(prev => ({
              ...prev,
              [roomId]: currentReading
            }));
            setPreviousReadings(prev => ({
              ...prev,
              [roomId]: currentReading
            }));
          } else {
            failedRooms.push(`${room.number} (${result.error || 'เกิดข้อผิดพลาดในการบันทึก'})`);
          }
        } catch (error) {
          console.error(`Error saving meter reading for room ${room.number}:`, error);
          failedRooms.push(room.number);
        }
      }

      if (failedRooms.length > 0) {
        toast.error(`ไม่สามารถบันทึกค่ามิเตอร์ของห้อง: ${failedRooms.join(', ')}`);
      } else {
        setUnsavedReadings({});
        setIsModified(false);
        toast.success('บันทึกค่ามิเตอร์ทั้งหมดเรียบร้อย');
      }
    } catch (error) {
      console.error('Error saving all readings:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกค่ามิเตอร์');
    } finally {
      setIsSaving(false);
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
            {/* เพิ่มปุ่มบันทึกทั้งหมด */}
            <button
              onClick={handleSaveAll}
              disabled={isSaving || Object.keys(unsavedReadings).length === 0}
              className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "px-4 py-2 h-9",
                isSaving || Object.keys(unsavedReadings).length === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  บันทึกทั้งหมด {Object.keys(unsavedReadings).length > 0 && `(${Object.keys(unsavedReadings).length})`}
                </>
              )}
            </button>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เลขห้อง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้เช่า
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ค่ามิเตอร์ครั้งก่อน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ค่ามิเตอร์ครั้งนี้
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะการบันทึก
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จำนวนหน่วยที่ใช้
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => {
                      const previousReading = previousReadings[room.id] || 0;
                      const currentReading = meterReadings[room.id] || '';
                      const unitsUsed = currentReading ? currentReading - previousReading : 0;
                      const isSaved = typeof meterReadings[room.id] === 'number' && !errors[room.id];

                      return (
                        <tr key={room.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {room.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {room.tenantName || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {previousReading}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative space-y-1">
                              <input
                                type="number"
                                value={currentReading}
                                onChange={(e) => handleMeterReadingChange(room.id, e.target.value)}
                                min={previousReading}
                                className={cn(
                                  "block w-32 rounded-md border shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm px-4 py-2.5 transition-colors",
                                  errors[room.id] ? "border-red-500 bg-red-50" : 
                                  isSaved
                                    ? "bg-gray-100 border-gray-200 text-gray-700"
                                    : "bg-white border-gray-300 hover:bg-gray-50"
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {isSaved ? (
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  บันทึกแล้ว: {currentReading}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {unitsUsed > 0 ? unitsUsed : '-'}
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
