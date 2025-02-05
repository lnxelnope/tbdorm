"use client";

import { FileText, Building2, User, Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Bill {
  id: string;
  roomNumber: string;
  dormitoryName: string;
  tenantName: string;
  dueDate: string;
  totalAmount: number;
  status: "pending" | "paid" | "overdue";
  items: {
    name: string;
    amount: number;
  }[];
}

export default function BillList() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const bills: Bill[] = [
    {
      id: "1",
      roomNumber: "101",
      dormitoryName: "หอพักสุขสบาย 1",
      tenantName: "สมชาย ใจดี",
      dueDate: "5 มีนาคม 2567",
      totalAmount: 5200,
      status: "pending",
      items: [
        { name: "ค่าเช่า", amount: 4000 },
        { name: "ค่าน้ำ", amount: 200 },
        { name: "ค่าไฟ", amount: 1000 },
      ],
    },
    {
      id: "2",
      roomNumber: "102",
      dormitoryName: "หอพักสุขสบาย 1",
      tenantName: "สมหญิง รักดี",
      dueDate: "5 มีนาคม 2567",
      totalAmount: 4800,
      status: "paid",
      items: [
        { name: "ค่าเช่า", amount: 4000 },
        { name: "ค่าน้ำ", amount: 200 },
        { name: "ค่าไฟ", amount: 600 },
      ],
    },
    {
      id: "3",
      roomNumber: "201",
      dormitoryName: "หอพักสุขสบาย 2",
      tenantName: "มานี มีทรัพย์",
      dueDate: "1 มีนาคม 2567",
      totalAmount: 5500,
      status: "overdue",
      items: [
        { name: "ค่าเช่า", amount: 4000 },
        { name: "ค่าน้ำ", amount: 300 },
        { name: "ค่าไฟ", amount: 1200 },
      ],
    },
  ];

  const getStatusColor = (status: Bill["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-800 ring-yellow-600/20";
      case "paid":
        return "bg-green-50 text-green-800 ring-green-600/20";
      case "overdue":
        return "bg-red-50 text-red-800 ring-red-600/20";
    }
  };

  const getStatusText = (status: Bill["status"]) => {
    switch (status) {
      case "pending":
        return "รอชำระ";
      case "paid":
        return "ชำระแล้ว";
      case "overdue":
        return "เกินกำหนด";
    }
  };

  return (
    <div className="overflow-hidden">
      <ul role="list" className="space-y-4">
        {bills.map((bill) => (
          <li
            key={bill.id}
            className="bg-white shadow rounded-lg overflow-hidden hover:bg-gray-50 transition-colors"
          >
            <Link href={`/bills/${bill.id}`} className="block">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 text-gray-400" />
                    <div className="ml-4">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <p className="ml-1 text-sm font-medium text-gray-900">
                          {bill.dormitoryName} ห้อง {bill.roomNumber}
                        </p>
                      </div>
                      <div className="flex items-center mt-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="ml-1 text-sm text-gray-500">
                          {bill.tenantName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(
                      bill.status
                    )}`}
                  >
                    {getStatusText(bill.status)}
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-sm">
                    <div className="space-y-1">
                      {bill.items.map((item, index) => (
                        <div key={index} className="text-gray-500">
                          {item.name}: {item.amount.toLocaleString()} บาท
                        </div>
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {bill.totalAmount.toLocaleString()} บาท
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        ครบกำหนด: {bill.dueDate}
                      </div>
                      {bill.status === "overdue" && (
                        <div className="flex items-center text-red-600 mt-1">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          เกินกำหนดชำระ
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 