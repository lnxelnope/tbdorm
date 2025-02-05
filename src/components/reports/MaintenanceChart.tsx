"use client";

import { Wrench, Clock } from "lucide-react";

type MaintenanceStatus = "pending" | "in-progress" | "completed" | "cancelled";
type MaintenancePriority = "high" | "medium" | "low";

interface MaintenanceRequest {
  id: string;
  type: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  requestedAt: string;
  completedAt?: string;
}

interface MaintenanceStats {
  total: number;
  byStatus: Record<MaintenanceStatus, number>;
  byPriority: Record<MaintenancePriority, number>;
  byType: { [key: string]: number };
  monthlyTrend: {
    month: string;
    total: number;
    completed: number;
  }[];
  averageCompletionTime: number; // ในหน่วยชั่วโมง
}

export default function MaintenanceChart() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const stats: MaintenanceStats = {
    total: 150,
    byStatus: {
      pending: 30,
      "in-progress": 45,
      completed: 65,
      cancelled: 10,
    },
    byPriority: {
      high: 40,
      medium: 70,
      low: 40,
    },
    byType: {
      "ระบบไฟฟ้า": 45,
      "ระบบประปา": 35,
      "เครื่องปรับอากาศ": 30,
      "อุปกรณ์ในห้อง": 25,
      "อื่นๆ": 15,
    },
    monthlyTrend: [
      { month: "ม.ค.", total: 45, completed: 38 },
      { month: "ก.พ.", total: 52, completed: 45 },
      { month: "มี.ค.", total: 48, completed: 40 },
    ],
    averageCompletionTime: 48,
  };

  const getStatusColor = (status: MaintenanceStatus) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      "in-progress": "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status];
  };

  const getPriorityColor = (priority: MaintenancePriority) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    };
    return colors[priority];
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            สถานะการซ่อมบำรุง
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      getStatusColor(status as MaintenanceStatus).split(" ")[0]
                    }`}
                  />
                  <span className="text-sm text-gray-600">
                    {status === "pending"
                      ? "รอดำเนินการ"
                      : status === "in-progress"
                      ? "กำลังดำเนินการ"
                      : status === "completed"
                      ? "เสร็จสิ้น"
                      : "ยกเลิก"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {count}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    ({((count / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            ระดับความสำคัญ
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-2 ${
                      getPriorityColor(priority as MaintenancePriority).split(
                        " "
                      )[0]
                    }`}
                  />
                  <span className="text-sm text-gray-600">
                    {priority === "high"
                      ? "สูง"
                      : priority === "medium"
                      ? "ปานกลาง"
                      : "ต่ำ"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {count}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    ({((count / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          ประเภทการซ่อมบำรุง
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{type}</span>
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">{count}</span>
                  <span className="text-gray-500 ml-1">
                    ({((count / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="mt-1 w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${(count / stats.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            แนวโน้มรายเดือน
          </h3>
          <div className="relative">
            <div className="flex items-end justify-between h-32">
              {stats.monthlyTrend.map((month) => (
                <div
                  key={month.month}
                  className="flex flex-col items-center w-1/3"
                >
                  <div className="relative w-16">
                    <div
                      className="w-8 bg-blue-500 rounded-t absolute left-0"
                      style={{
                        height: `${(month.total / 60) * 100}%`,
                      }}
                    />
                    <div
                      className="w-8 bg-green-500 rounded-t absolute right-0"
                      style={{
                        height: `${(month.completed / 60) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">{month.month}</div>
                  <div className="text-xs text-gray-500">
                    <span className="text-blue-600">{month.total}</span>
                    {" / "}
                    <span className="text-green-600">{month.completed}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg border">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            เวลาเฉลี่ยในการดำเนินการ
          </h3>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-semibold text-gray-900">
                {stats.averageCompletionTime}
              </div>
              <div className="text-sm text-gray-500">ชั่วโมง</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 