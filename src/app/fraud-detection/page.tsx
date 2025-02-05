"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, AlertTriangle, Settings2, BarChart3 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Room, UtilityReading } from "@/types/dormitory";
import { getRooms, getUtilityReadings } from "@/lib/firebase/firebaseUtils";

export default function FraudDetectionPage() {
  const [activeTab, setActiveTab] = useState<'report' | 'settings'>('report');
  const [settings, setSettings] = useState({
    vacantRoomThreshold: 10,
    highUsageThreshold: 200,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [alerts, setAlerts] = useState<{
    roomId: string;
    type: 'vacant' | 'high';
    units: number;
    date: Date;
  }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [roomsResult, readingsResult] = await Promise.all([
        getRooms("your-dormitory-id"), // TODO: ใส่ dormitory ID จริง
        getUtilityReadings("your-dormitory-id") // TODO: ใส่ dormitory ID จริง
      ]);

      if (roomsResult.success && roomsResult.data) {
        setRooms(roomsResult.data);
      }

      if (readingsResult.success && readingsResult.data) {
        const electricReadings = readingsResult.data.filter(r => r.type === 'electric');
        setReadings(electricReadings);
        
        // คำนวณการแจ้งเตือน
        const newAlerts = [];
        for (const room of roomsResult.data) {
          const roomReadings = electricReadings.filter(r => r.roomId === room.id);
          if (roomReadings.length === 0) continue;

          // เรียงตามวันที่ล่าสุด
          roomReadings.sort((a, b) => {
            const dateA = new Date(a.readingDate);
            const dateB = new Date(b.readingDate);
            return dateB.getTime() - dateA.getTime();
          });

          const latestReading = roomReadings[0];
          const units = latestReading.units;

          // ตรวจสอบห้องว่าง
          if (room.status === 'available' && units > settings.vacantRoomThreshold) {
            newAlerts.push({
              roomId: room.id,
              type: 'vacant',
              units,
              date: new Date(latestReading.readingDate)
            });
          }

          // ตรวจสอบการใช้ไฟสูง
          if (units > settings.highUsageThreshold) {
            newAlerts.push({
              roomId: room.id,
              type: 'high',
              units,
              date: new Date(latestReading.readingDate)
            });
          }
        }
        setAlerts(newAlerts);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: บันทึกการตั้งค่าลง Firebase
    toast.success("บันทึกการตั้งค่าเรียบร้อย");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-700 mr-4">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          ระบบตรวจจับการใช้ไฟผิดปกติ
        </h1>
      </div>

      {/* แท็บเมนู */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('report')}
            className={`${
              activeTab === 'report'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            รายงาน
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            ตั้งค่า
          </button>
        </nav>
      </div>

      {activeTab === 'report' ? (
        <div className="space-y-6">
          {/* สรุปภาพรวม */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">การแจ้งเตือนทั้งหมด</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{alerts.length}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">ห้องว่างใช้ไฟผิดปกติ</h3>
              <p className="mt-2 text-3xl font-semibold text-orange-600">
                {alerts.filter(a => a.type === 'vacant').length}
              </p>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">ห้องใช้ไฟสูงผิดปกติ</h3>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {alerts.filter(a => a.type === 'high').length}
              </p>
            </div>
          </div>

          {/* รายการแจ้งเตือน */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">รายการแจ้งเตือน</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ห้อง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ประเภท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หน่วยที่ใช้
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่ตรวจพบ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        ไม่พบการแจ้งเตือน
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alert, index) => {
                      const room = rooms.find(r => r.id === alert.roomId);
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ห้อง {room?.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              alert.type === 'vacant' 
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {alert.type === 'vacant' ? 'ห้องว่างใช้ไฟผิดปกติ' : 'ใช้ไฟสูงผิดปกติ'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {alert.units.toFixed(2)} หน่วย
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {alert.date.toLocaleDateString('th-TH')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* คำแนะนำ */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">คำแนะนำในการตรวจสอบ</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>ตรวจสอบสถานะห้องพักว่าว่างจริงหรือไม่</li>
                    <li>เปรียบเทียบค่ามิเตอร์กับเดือนก่อนหน้า</li>
                    <li>สอบถามพนักงานที่ดูแลหอพัก</li>
                    <li>ตรวจสอบกล้องวงจรปิด (ถ้ามี)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค่าไฟห้องว่างเกิน (หน่วย)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      value={settings.vacantRoomThreshold}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        vacantRoomThreshold: parseFloat(e.target.value)
                      }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    แจ้งเตือนเมื่อห้องว่างมีการใช้ไฟเกินจำนวนหน่วยที่กำหนด
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ค่าไฟใช้สูงผิดปกติ (หน่วย)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      value={settings.highUsageThreshold}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        highUsageThreshold: parseFloat(e.target.value)
                      }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    แจ้งเตือนเมื่อห้องมีการใช้ไฟสูงผิดปกติเกินจำนวนหน่วยที่กำหนด
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Save className="w-4 h-4 mr-2" />
                บันทึกการตั้งค่า
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 