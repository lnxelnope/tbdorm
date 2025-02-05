"use client";

import { Download } from "lucide-react";
import OccupancyChart from "@/components/reports/OccupancyChart";
import RevenueChart from "@/components/reports/RevenueChart";
import MaintenanceChart from "@/components/reports/MaintenanceChart";
import UtilityUsageChart from "@/components/reports/UtilityUsageChart";

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            รายงานและสถิติ
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            ข้อมูลสรุปและการวิเคราะห์สำหรับการบริหารหอพัก
          </p>
        </div>
        <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          ดาวน์โหลดรายงาน
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            อัตราการเข้าพัก
          </h2>
          <OccupancyChart />
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            รายรับ-รายจ่าย
          </h2>
          <RevenueChart />
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            การซ่อมบำรุง
          </h2>
          <MaintenanceChart />
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            การใช้สาธารณูปโภค
          </h2>
          <UtilityUsageChart />
        </div>
      </div>
    </div>
  );
} 