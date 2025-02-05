"use client";

import { ArrowUp, ArrowDown, Clock } from "lucide-react";

type Trend = "up" | "down";

export default function MaintenanceSummary() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const summary = {
    totalRequests: 50,
    pendingRequests: 10,
    inProgressRequests: 15,
    completedRequests: 20,
    cancelledRequests: 5,
    byPriority: {
      high: 8,
      medium: 22,
      low: 20,
    },
    byType: [
      { name: "เครื่องทำน้ำอุ่น", count: 15 },
      { name: "แอร์", count: 12 },
      { name: "ประตู/หน้าต่าง", count: 8 },
      { name: "ห้องน้ำ", count: 10 },
      { name: "อื่นๆ", count: 5 },
    ],
    monthlyComparison: {
      trend: "down" as Trend,
      percentage: 10,
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <dl className="grid grid-cols-2 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-yellow-800">รอดำเนินการ</dt>
            <dd className="mt-1 text-2xl font-semibold text-yellow-900">
              {summary.pendingRequests}
            </dd>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-blue-800">กำลังดำเนินการ</dt>
            <dd className="mt-1 text-2xl font-semibold text-blue-900">
              {summary.inProgressRequests}
            </dd>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-green-800">เสร็จสิ้น</dt>
            <dd className="mt-1 text-2xl font-semibold text-green-900">
              {summary.completedRequests}
            </dd>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-gray-800">ยกเลิก</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {summary.cancelledRequests}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          แยกตามความเร่งด่วน
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-red-600">ด่วน</span>
              <span className="text-gray-500">{summary.byPriority.high} รายการ</span>
            </div>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{
                  width: `${(summary.byPriority.high / summary.totalRequests) * 100}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-yellow-600">ปานกลาง</span>
              <span className="text-gray-500">{summary.byPriority.medium} รายการ</span>
            </div>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{
                  width: `${(summary.byPriority.medium / summary.totalRequests) * 100}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-green-600">ไม่เร่งด่วน</span>
              <span className="text-gray-500">{summary.byPriority.low} รายการ</span>
            </div>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${(summary.byPriority.low / summary.totalRequests) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          แยกตามประเภท
        </h3>
        <div className="space-y-3">
          {summary.byType.map((type) => (
            <div key={type.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">{type.name}</span>
                <span className="text-gray-500">{type.count} รายการ</span>
              </div>
              <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-500 h-2 rounded-full"
                  style={{
                    width: `${(type.count / summary.totalRequests) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-900">
          เปรียบเทียบกับเดือนที่แล้ว
        </h3>
        <div className="mt-2 flex items-center">
          {summary.monthlyComparison.trend === "up" ? (
            <ArrowUp className="h-4 w-4 text-red-500" />
          ) : (
            <ArrowDown className="h-4 w-4 text-green-500" />
          )}
          <span
            className={`ml-1 text-sm font-medium ${
              summary.monthlyComparison.trend === "up"
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {summary.monthlyComparison.percentage}%
          </span>
          <span className="ml-2 text-sm text-gray-500">
            {summary.monthlyComparison.trend === "up"
              ? "เพิ่มขึ้น"
              : "ลดลง"}
          </span>
        </div>
      </div>
    </div>
  );
} 