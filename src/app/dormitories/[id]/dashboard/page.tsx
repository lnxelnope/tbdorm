"use client";

import { useState, useEffect } from "react";
import { getDormitory, getRooms } from "@/lib/firebase/firebaseUtils";
import { Room } from "@/types/dormitory";
import { ArrowLeft, Home, Users, Wrench, Zap } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function DashboardPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitoryName, setDormitoryName] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dormitoryResult, roomsResult] = await Promise.all([
          getDormitory(params.id),
          getRooms(params.id),
        ]);

        if (dormitoryResult.success && dormitoryResult.data) {
          setDormitoryName(dormitoryResult.data.name);
        }

        if (roomsResult.success && roomsResult.data) {
          setRooms(roomsResult.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [params.id]);

  // คำนวณสถิติทั่วไป
  const stats = {
    totalRooms: rooms.length,
    occupiedRooms: rooms.filter(room => room.status === 'occupied').length,
    availableRooms: rooms.filter(room => room.status === 'available').length,
    maintenanceRooms: rooms.filter(room => room.status === 'maintenance').length,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* หัวข้อ */}
      <div className="mb-8">
        <div className="flex items-center">
          <Link
            href={`/dormitories/${params.id}`}
            className="text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{dormitoryName}</h1>
            <p className="mt-1 text-sm text-gray-500">แดชบอร์ดแสดงภาพรวมของหอพัก</p>
          </div>
        </div>
      </div>

      {/* สถิติทั่วไป */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Home className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">จำนวนห้องทั้งหมด</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.totalRooms}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">ห้องที่มีผู้เช่า</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.occupiedRooms}</div>
                    <div className="ml-2">
                      <span className="text-sm text-gray-500">
                        ({((stats.occupiedRooms / stats.totalRooms) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Home className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">ห้องว่าง</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.availableRooms}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wrench className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">ห้องที่กำลังปรับปรุง</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.maintenanceRooms}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ลิงก์ไปยังรายงาน */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">รายงานเพิ่มเติม</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/dormitories/${params.id}/reports/electricity`}
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            <Zap className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">รายงานการใช้ไฟฟ้า</h3>
              <p className="text-sm text-blue-500">ดูสรุปการใช้ไฟฟ้าและค่าใช้จ่าย</p>
            </div>
          </Link>
          {/* เพิ่มลิงก์ไปยังรายงานอื่นๆ ที่นี่ */}
        </div>
      </div>
    </div>
  );
} 