"use client";

import { Wrench, Building2, User, Clock, Camera } from "lucide-react";
import Link from "next/link";

interface MaintenanceRequest {
  id: string;
  roomNumber: string;
  dormitoryName: string;
  tenantName: string;
  type: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  requestedAt: string;
  assignedTo?: string;
  completedAt?: string;
  photos?: string[];
}

export default function MaintenanceList() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const requests: MaintenanceRequest[] = [
    {
      id: "1",
      roomNumber: "101",
      dormitoryName: "หอพักสุขสบาย 1",
      tenantName: "สมชาย ใจดี",
      type: "เครื่องทำน้ำอุ่น",
      description: "น้ำไม่ร้อน ไฟไม่ติด",
      status: "pending",
      priority: "high",
      requestedAt: "2 ชั่วโมงที่แล้ว",
      photos: ["/maintenance-photo.jpg"],
    },
    {
      id: "2",
      roomNumber: "205",
      dormitoryName: "หอพักสุขสบาย 2",
      tenantName: "สมหญิง รักดี",
      type: "แอร์",
      description: "แอร์ไม่เย็น น้ำหยด",
      status: "in_progress",
      priority: "medium",
      requestedAt: "1 วันที่แล้ว",
      assignedTo: "ช่างสมศักดิ์",
    },
    {
      id: "3",
      roomNumber: "303",
      dormitoryName: "หอพักสุขสบาย 1",
      tenantName: "มานี มีทรัพย์",
      type: "ประตู",
      description: "กลอนประตูห้องน้ำเสีย",
      status: "completed",
      priority: "low",
      requestedAt: "2 วันที่แล้ว",
      assignedTo: "ช่างสมชาย",
      completedAt: "1 วันที่แล้ว",
    },
  ];

  const getStatusColor = (status: MaintenanceRequest["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-800 ring-yellow-600/20";
      case "in_progress":
        return "bg-blue-50 text-blue-800 ring-blue-600/20";
      case "completed":
        return "bg-green-50 text-green-800 ring-green-600/20";
      case "cancelled":
        return "bg-gray-50 text-gray-800 ring-gray-600/20";
    }
  };

  const getStatusText = (status: MaintenanceRequest["status"]) => {
    switch (status) {
      case "pending":
        return "รอดำเนินการ";
      case "in_progress":
        return "กำลังดำเนินการ";
      case "completed":
        return "เสร็จสิ้น";
      case "cancelled":
        return "ยกเลิก";
    }
  };

  const getPriorityColor = (priority: MaintenanceRequest["priority"]) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
    }
  };

  const getPriorityText = (priority: MaintenanceRequest["priority"]) => {
    switch (priority) {
      case "high":
        return "ด่วน";
      case "medium":
        return "ปานกลาง";
      case "low":
        return "ไม่เร่งด่วน";
    }
  };

  return (
    <div className="overflow-hidden">
      <ul role="list" className="space-y-4">
        {requests.map((request) => (
          <li
            key={request.id}
            className="bg-white shadow rounded-lg overflow-hidden hover:bg-gray-50 transition-colors"
          >
            <Link href={`/maintenance/${request.id}`} className="block">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wrench className="h-6 w-6 text-gray-400" />
                    <div className="ml-4">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <p className="ml-1 text-sm font-medium text-gray-900">
                          {request.dormitoryName} ห้อง {request.roomNumber}
                        </p>
                      </div>
                      <div className="flex items-center mt-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="ml-1 text-sm text-gray-500">
                          {request.tenantName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${getPriorityColor(
                        request.priority
                      )}`}
                    >
                      {getPriorityText(request.priority)}
                    </span>
                    <div
                      className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {getStatusText(request.status)}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-900">
                    {request.type}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {request.description}
                  </div>
                  {request.assignedTo && (
                    <div className="mt-2 text-sm text-gray-500">
                      ผู้รับผิดชอบ: {request.assignedTo}
                    </div>
                  )}
                  {request.photos && request.photos.length > 0 && (
                    <div className="mt-2 flex items-center text-sm text-blue-600">
                      <Camera className="h-4 w-4 mr-1" />
                      ดูรูปภาพ ({request.photos.length})
                    </div>
                  )}
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    แจ้งซ่อมเมื่อ: {request.requestedAt}
                    {request.completedAt && ` • เสร็จสิ้นเมื่อ: ${request.completedAt}`}
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