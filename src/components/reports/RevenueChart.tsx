"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

type TrendType = "up" | "down";

interface ComparisonData {
  trend: TrendType;
  percentage: number;
}

interface MonthlyData {
  revenue: number;
  expenses: number;
  profit: number;
  comparison: {
    revenue: ComparisonData;
    expenses: ComparisonData;
    profit: ComparisonData;
  };
}

interface CategoryItem {
  name: string;
  amount: number;
}

interface TrendItem {
  month: string;
  revenue: number;
  expenses: number;
}

interface ChartData {
  currentMonth: MonthlyData;
  byCategory: {
    revenue: CategoryItem[];
    expenses: CategoryItem[];
  };
  monthlyTrend: TrendItem[];
}

export default function RevenueChart() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const data: ChartData = {
    currentMonth: {
      revenue: 500000,
      expenses: 150000,
      profit: 350000,
      comparison: {
        revenue: { trend: "up", percentage: 10 },
        expenses: { trend: "down", percentage: 5 },
        profit: { trend: "up", percentage: 15 },
      },
    },
    byCategory: {
      revenue: [
        { name: "ค่าเช่า", amount: 400000 },
        { name: "ค่าน้ำ", amount: 50000 },
        { name: "ค่าไฟ", amount: 50000 },
      ],
      expenses: [
        { name: "ค่าซ่อมบำรุง", amount: 80000 },
        { name: "ค่าทำความสะอาด", amount: 40000 },
        { name: "ค่าสาธารณูปโภค", amount: 30000 },
      ],
    },
    monthlyTrend: [
      { month: "ม.ค.", revenue: 480000, expenses: 160000 },
      { month: "ก.พ.", revenue: 450000, expenses: 140000 },
      { month: "มี.ค.", revenue: 500000, expenses: 150000 },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-800">รายรับ</p>
          <p className="mt-1 text-2xl font-semibold text-green-900">
            {data.currentMonth.revenue.toLocaleString()} บาท
          </p>
          <div className="mt-1 flex items-center">
            {data.currentMonth.comparison.revenue.trend === "up" ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`ml-1 text-sm font-medium ${
                data.currentMonth.comparison.revenue.trend === "up"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {data.currentMonth.comparison.revenue.percentage}%
            </span>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-red-800">รายจ่าย</p>
          <p className="mt-1 text-2xl font-semibold text-red-900">
            {data.currentMonth.expenses.toLocaleString()} บาท
          </p>
          <div className="mt-1 flex items-center">
            {data.currentMonth.comparison.expenses.trend === "up" ? (
              <ArrowUp className="h-4 w-4 text-red-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-green-500" />
            )}
            <span
              className={`ml-1 text-sm font-medium ${
                data.currentMonth.comparison.expenses.trend === "up"
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {data.currentMonth.comparison.expenses.percentage}%
            </span>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-800">กำไร</p>
          <p className="mt-1 text-2xl font-semibold text-blue-900">
            {data.currentMonth.profit.toLocaleString()} บาท
          </p>
          <div className="mt-1 flex items-center">
            {data.currentMonth.comparison.profit.trend === "up" ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`ml-1 text-sm font-medium ${
                data.currentMonth.comparison.profit.trend === "up"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {data.currentMonth.comparison.profit.percentage}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            รายรับแยกตามประเภท
          </h3>
          <div className="space-y-3">
            {data.byCategory.revenue.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="text-gray-500">
                    {item.amount.toLocaleString()} บาท
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(item.amount / data.currentMonth.revenue) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            รายจ่ายแยกตามประเภท
          </h3>
          <div className="space-y-3">
            {data.byCategory.expenses.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="text-gray-500">
                    {item.amount.toLocaleString()} บาท
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${(item.amount / data.currentMonth.expenses) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          แนวโน้มรายเดือน
        </h3>
        <div className="relative">
          <div className="flex items-end justify-between h-32">
            {data.monthlyTrend.map((month) => (
              <div
                key={month.month}
                className="flex flex-col items-center w-1/3"
              >
                <div className="relative w-16">
                  <div
                    className="w-8 bg-green-500 rounded-t absolute left-0"
                    style={{
                      height: `${(month.revenue / 600000) * 100}%`,
                    }}
                  />
                  <div
                    className="w-8 bg-red-500 rounded-t absolute right-0"
                    style={{
                      height: `${(month.expenses / 600000) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-500">{month.month}</div>
                <div className="text-xs text-gray-500">
                  <span className="text-green-600">
                    {(month.revenue / 1000).toLocaleString()}K
                  </span>
                  {" / "}
                  <span className="text-red-600">
                    {(month.expenses / 1000).toLocaleString()}K
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 