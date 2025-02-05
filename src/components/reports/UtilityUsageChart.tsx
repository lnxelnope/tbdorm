"use client";

import { Droplets, Zap } from "lucide-react";

interface UtilityData {
  water: {
    current: number;
    previous: number;
    trend: "up" | "down";
    percentage: number;
    byDormitory: {
      name: string;
      usage: number;
    }[];
    monthlyTrend: {
      month: string;
      usage: number;
    }[];
  };
  electricity: {
    current: number;
    previous: number;
    trend: "up" | "down";
    percentage: number;
    byDormitory: {
      name: string;
      usage: number;
    }[];
    monthlyTrend: {
      month: string;
      usage: number;
    }[];
  };
}

export default function UtilityUsageChart() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const data: UtilityData = {
    water: {
      current: 2500,
      previous: 2300,
      trend: "up",
      percentage: 8.7,
      byDormitory: [
        { name: "อาคาร A", usage: 800 },
        { name: "อาคาร B", usage: 950 },
        { name: "อาคาร C", usage: 750 },
      ],
      monthlyTrend: [
        { month: "ม.ค.", usage: 2300 },
        { month: "ก.พ.", usage: 2400 },
        { month: "มี.ค.", usage: 2500 },
      ],
    },
    electricity: {
      current: 15000,
      previous: 14200,
      trend: "up",
      percentage: 5.6,
      byDormitory: [
        { name: "อาคาร A", usage: 4800 },
        { name: "อาคาร B", usage: 5700 },
        { name: "อาคาร C", usage: 4500 },
      ],
      monthlyTrend: [
        { month: "ม.ค.", usage: 14200 },
        { month: "ก.พ.", usage: 14800 },
        { month: "มี.ค.", usage: 15000 },
      ],
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* น้ำประปา */}
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Droplets className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="text-sm font-medium text-blue-900">น้ำประปา</h3>
              </div>
              <div className="text-sm text-blue-900">
                {data.water.current.toLocaleString()} หน่วย
              </div>
            </div>
            <div className="mt-1 flex items-center text-sm">
              <span
                className={`${
                  data.water.trend === "up"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {data.water.trend === "up" ? "+" : "-"}
                {data.water.percentage}%
              </span>
              <span className="text-gray-500 ml-1">จากเดือนที่แล้ว</span>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              การใช้น้ำแยกตามอาคาร
            </h4>
            <div className="space-y-3">
              {data.water.byDormitory.map((dorm) => (
                <div key={dorm.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{dorm.name}</span>
                    <span className="font-medium text-gray-900">
                      {dorm.usage.toLocaleString()} หน่วย
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(dorm.usage / data.water.current) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              แนวโน้มการใช้น้ำ
            </h4>
            <div className="relative">
              <div className="flex items-end justify-between h-32">
                {data.water.monthlyTrend.map((month) => (
                  <div
                    key={month.month}
                    className="flex flex-col items-center w-1/3"
                  >
                    <div
                      className="w-12 bg-blue-500 rounded-t"
                      style={{
                        height: `${(month.usage / 3000) * 100}%`,
                      }}
                    />
                    <div className="mt-2 text-sm text-gray-500">{month.month}</div>
                    <div className="text-xs text-gray-500">
                      {month.usage.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ไฟฟ้า */}
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                <h3 className="text-sm font-medium text-yellow-900">ไฟฟ้า</h3>
              </div>
              <div className="text-sm text-yellow-900">
                {data.electricity.current.toLocaleString()} หน่วย
              </div>
            </div>
            <div className="mt-1 flex items-center text-sm">
              <span
                className={`${
                  data.electricity.trend === "up"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {data.electricity.trend === "up" ? "+" : "-"}
                {data.electricity.percentage}%
              </span>
              <span className="text-gray-500 ml-1">จากเดือนที่แล้ว</span>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              การใช้ไฟฟ้าแยกตามอาคาร
            </h4>
            <div className="space-y-3">
              {data.electricity.byDormitory.map((dorm) => (
                <div key={dorm.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{dorm.name}</span>
                    <span className="font-medium text-gray-900">
                      {dorm.usage.toLocaleString()} หน่วย
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (dorm.usage / data.electricity.current) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              แนวโน้มการใช้ไฟฟ้า
            </h4>
            <div className="relative">
              <div className="flex items-end justify-between h-32">
                {data.electricity.monthlyTrend.map((month) => (
                  <div
                    key={month.month}
                    className="flex flex-col items-center w-1/3"
                  >
                    <div
                      className="w-12 bg-yellow-500 rounded-t"
                      style={{
                        height: `${(month.usage / 18000) * 100}%`,
                      }}
                    />
                    <div className="mt-2 text-sm text-gray-500">{month.month}</div>
                    <div className="text-xs text-gray-500">
                      {month.usage.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 