"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  getDormitory,
  getUtilityReadings,
  getRooms,
} from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ElectricityReportPage({
  params,
}: {
  params: { id: string };
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitory, setDormitory] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRate, setCurrentRate] = useState("4.5"); // อัตราค่าไฟปัจจุบัน
  const [monthlyUsage, setMonthlyUsage] = useState<any[]>([]);
  const [topRooms, setTopRooms] = useState<any[]>([]);

  const calculateMonthlyUsage = useCallback((readings: any[]) => {
    const monthlyData: { [key: string]: number } = {};
    readings.forEach((reading) => {
      const date = new Date(reading.readingDate);
      const monthYear = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      monthlyData[monthYear] = (monthlyData[monthYear] || 0) + reading.units;
    });

    return Object.entries(monthlyData)
      .map(([month, units]) => ({
        month,
        units,
        cost: units * parseFloat(currentRate),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [currentRate]);

  const calculateTopRooms = useCallback((readings: any[]) => {
    const roomUsage: { [key: string]: number } = {};
    readings.forEach((reading) => {
      roomUsage[reading.roomId] = (roomUsage[reading.roomId] || 0) + reading.units;
    });

    return Object.entries(roomUsage)
      .map(([roomId, units]) => ({
        roomId,
        units,
        cost: units * parseFloat(currentRate),
      }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [currentRate]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dormitoryResult, readingsResult, roomsResult] = await Promise.all([
        getDormitory(params.id),
        getUtilityReadings(params.id),
        getRooms(params.id),
      ]);

      if (dormitoryResult.success && dormitoryResult.data) {
        setDormitory(dormitoryResult.data);
      }

      if (readingsResult.success && readingsResult.data) {
        const electricReadings = readingsResult.data.filter(
          (r: any) => r.type === "electric"
        );
        setReadings(electricReadings);

        // คำนวณการใช้ไฟฟ้ารายเดือน
        const monthly = calculateMonthlyUsage(electricReadings);
        setMonthlyUsage(monthly);

        // คำนวณห้องที่ใช้ไฟมากที่สุด
        const top = calculateTopRooms(electricReadings);
        setTopRooms(top);
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
  }, [params.id, calculateMonthlyUsage, calculateTopRooms]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getTotalUsage = () => {
    return readings.reduce((sum, reading) => sum + reading.units, 0);
  };

  const getEstimatedCost = () => {
    return getTotalUsage() * parseFloat(currentRate);
  };

  const getAverageUsagePerRoom = () => {
    if (rooms.length === 0) return 0;
    return getTotalUsage() / rooms.length;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link
          href={`/dormitories/${params.id}/reports`}
          className="text-gray-500 hover:text-gray-700 mr-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            รายงานการใช้ไฟฟ้า
          </h1>
          {dormitory && (
            <p className="text-sm text-gray-500">{dormitory.name}</p>
          )}
        </div>
      </div>

      {/* สรุปภาพรวม */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            อัตราค่าไฟปัจจุบัน
          </h3>
          <div className="flex items-center">
            <input
              type="number"
              value={currentRate}
              onChange={(e) => setCurrentRate(e.target.value)}
              className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm mr-2"
              step="0.01"
              min="0"
            />
            <span className="text-sm text-gray-500">บาท/หน่วย</span>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            ปริมาณการใช้ไฟฟ้ารวม
          </h3>
          <p className="text-2xl font-semibold text-gray-900">
            {getTotalUsage().toLocaleString()} หน่วย
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            ค่าไฟฟ้าโดยประมาณ
          </h3>
          <p className="text-2xl font-semibold text-gray-900">
            ฿{getEstimatedCost().toLocaleString()}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            ค่าเฉลี่ยต่อห้อง
          </h3>
          <p className="text-2xl font-semibold text-gray-900">
            {getAverageUsagePerRoom().toLocaleString()} หน่วย
          </p>
        </div>
      </div>

      {/* กราฟแสดงการใช้ไฟฟ้ารายเดือน */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          การใช้ไฟฟ้ารายเดือน
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="units"
                stroke="#2563eb"
                name="หน่วยที่ใช้"
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="#dc2626"
                name="ค่าไฟ (บาท)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ห้องที่ใช้ไฟมากที่สุด */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            ห้องที่ใช้ไฟฟ้ามากที่สุด 5 อันดับ
          </h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ห้อง
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ปริมาณการใช้
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ค่าไฟโดยประมาณ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {topRooms.map((room) => (
              <tr key={room.roomId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ห้อง {room.roomId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {room.units.toLocaleString()} หน่วย
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ฿{room.cost.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 