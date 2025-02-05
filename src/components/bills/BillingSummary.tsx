"use client";

import { ArrowUp, ArrowDown, Clock } from "lucide-react";

export default function BillingSummary() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const summary = {
    totalBills: 150,
    totalAmount: 750000,
    paidBills: 120,
    paidAmount: 600000,
    pendingBills: 20,
    pendingAmount: 100000,
    overdueBills: 10,
    overdueAmount: 50000,
    monthlyComparison: {
      trend: "up" as const,
      percentage: 5,
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <dl className="grid grid-cols-1 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <dt className="text-sm font-medium text-gray-500">ยอดรวมทั้งหมด</dt>
            <dd className="mt-1">
              <div className="text-2xl font-semibold text-gray-900">
                {summary.totalAmount.toLocaleString()} บาท
              </div>
              <div className="text-sm text-gray-500">
                จำนวน {summary.totalBills} บิล
              </div>
            </dd>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-green-800">ชำระแล้ว</dt>
            <dd className="mt-1">
              <div className="text-2xl font-semibold text-green-900">
                {summary.paidAmount.toLocaleString()} บาท
              </div>
              <div className="text-sm text-green-700">
                จำนวน {summary.paidBills} บิล
              </div>
            </dd>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-yellow-800">รอชำระ</dt>
            <dd className="mt-1">
              <div className="text-2xl font-semibold text-yellow-900">
                {summary.pendingAmount.toLocaleString()} บาท
              </div>
              <div className="text-sm text-yellow-700">
                จำนวน {summary.pendingBills} บิล
              </div>
            </dd>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-red-800">เกินกำหนด</dt>
            <dd className="mt-1">
              <div className="text-2xl font-semibold text-red-900">
                {summary.overdueAmount.toLocaleString()} บาท
              </div>
              <div className="text-sm text-red-700">
                จำนวน {summary.overdueBills} บิล
              </div>
            </dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-900">
          เปรียบเทียบกับเดือนที่แล้ว
        </h3>
        <div className="mt-2 flex items-center">
          {summary.monthlyComparison.trend === "up" ? (
            <ArrowUp className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-500" />
          )}
          <span
            className={`ml-1 text-sm font-medium ${
              summary.monthlyComparison.trend === "up"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {summary.monthlyComparison.percentage}%
          </span>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            การชำระเงินล่าสุด
          </h3>
          <Clock className="h-4 w-4 text-gray-400" />
        </div>
        <ul className="mt-4 space-y-3">
          <li className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ห้อง 101</span>
              <span className="font-medium text-gray-900">4,500 บาท</span>
            </div>
            <div className="text-gray-500">2 นาทีที่แล้ว</div>
          </li>
          <li className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ห้อง 205</span>
              <span className="font-medium text-gray-900">5,200 บาท</span>
            </div>
            <div className="text-gray-500">1 ชั่วโมงที่แล้ว</div>
          </li>
          <li className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ห้อง 303</span>
              <span className="font-medium text-gray-900">4,800 บาท</span>
            </div>
            <div className="text-gray-500">2 ชั่วโมงที่แล้ว</div>
          </li>
        </ul>
      </div>
    </div>
  );
} 