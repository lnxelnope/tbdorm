"use client";

import { Building2 } from "lucide-react";

export default function OccupancyChart() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const data = {
    overall: {
      total: 120,
      occupied: 100,
      rate: 83,
    },
    byDormitory: [
      {
        name: "หอพักสุขสบาย 1",
        total: 50,
        occupied: 45,
        rate: 90,
      },
      {
        name: "หอพักสุขสบาย 2",
        total: 40,
        occupied: 35,
        rate: 88,
      },
      {
        name: "หอพักสุขสบาย 3",
        total: 30,
        occupied: 20,
        rate: 67,
      },
    ],
    monthlyTrend: [
      { month: "ม.ค.", rate: 75 },
      { month: "ก.พ.", rate: 78 },
      { month: "มี.ค.", rate: 83 },
    ],
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3 bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                อัตราการเข้าพักรวม
              </p>
              <p className={`text-2xl font-semibold ${getOccupancyColor(data.overall.rate)}`}>
                {data.overall.rate}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {data.overall.occupied}/{data.overall.total} ห้อง
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          แยกตามหอพัก
        </h3>
        <div className="space-y-3">
          {data.byDormitory.map((dorm) => (
            <div key={dorm.name}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {dorm.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${getOccupancyColor(dorm.rate)}`}>
                    {dorm.rate}%
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({dorm.occupied}/{dorm.total})
                  </span>
                </div>
              </div>
              <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    dorm.rate >= 90
                      ? "bg-green-500"
                      : dorm.rate >= 70
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${dorm.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          แนวโน้มรายเดือน
        </h3>
        <div className="relative">
          <div className="flex items-end justify-between h-32">
            {data.monthlyTrend.map((month, index) => (
              <div
                key={month.month}
                className="flex flex-col items-center w-1/3"
              >
                <div
                  className={`w-12 ${
                    month.rate >= 90
                      ? "bg-green-500"
                      : month.rate >= 70
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  } rounded-t`}
                  style={{ height: `${month.rate}%` }}
                />
                <div className="mt-2 text-sm text-gray-500">{month.month}</div>
                <div className={`text-sm font-medium ${getOccupancyColor(month.rate)}`}>
                  {month.rate}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 