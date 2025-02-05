import { Droplets, Zap, Camera } from "lucide-react";
import Link from "next/link";

interface FraudAlert {
  id: string;
  type: "water" | "electricity";
  roomNumber: string;
  dormitoryName: string;
  unitsUsed: number;
  detectedAt: string;
  status: "pending" | "investigating" | "confirmed" | "false_alarm";
  investigatedBy?: string;
  resolution?: string;
  photoUrl?: string;
}

export default function FraudAlertList() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const alerts: FraudAlert[] = [
    {
      id: "1",
      type: "electricity",
      roomNumber: "101",
      dormitoryName: "หอพักสุขสบาย 1",
      unitsUsed: 150,
      detectedAt: "2 ชั่วโมงที่แล้ว",
      status: "pending",
      photoUrl: "/meter-photo.jpg",
    },
    {
      id: "2",
      type: "water",
      roomNumber: "205",
      dormitoryName: "หอพักสุขสบาย 2",
      unitsUsed: 20,
      detectedAt: "1 วันที่แล้ว",
      status: "investigating",
      investigatedBy: "สมชาย ใจดี",
    },
    {
      id: "3",
      type: "electricity",
      roomNumber: "303",
      dormitoryName: "หอพักสุขสบาย 1",
      unitsUsed: 80,
      detectedAt: "2 วันที่แล้ว",
      status: "confirmed",
      investigatedBy: "สมหญิง รักดี",
      resolution: "พบการลักลอบใช้ไฟฟ้าจริง ได้ดำเนินการแจ้งความแล้ว",
      photoUrl: "/meter-photo.jpg",
    },
  ];

  const getStatusColor = (status: FraudAlert["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 text-yellow-800 ring-yellow-600/20";
      case "investigating":
        return "bg-blue-50 text-blue-800 ring-blue-600/20";
      case "confirmed":
        return "bg-red-50 text-red-800 ring-red-600/20";
      case "false_alarm":
        return "bg-green-50 text-green-800 ring-green-600/20";
    }
  };

  const getStatusText = (status: FraudAlert["status"]) => {
    switch (status) {
      case "pending":
        return "รอตรวจสอบ";
      case "investigating":
        return "กำลังตรวจสอบ";
      case "confirmed":
        return "ยืนยันทุจริต";
      case "false_alarm":
        return "ไม่พบทุจริต";
    }
  };

  return (
    <div className="overflow-hidden">
      <ul role="list" className="space-y-4">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="bg-white shadow rounded-lg overflow-hidden hover:bg-gray-50 transition-colors"
          >
            <Link href={`/fraud-detection/${alert.id}`} className="block">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {alert.type === "electricity" ? (
                      <Zap className="h-6 w-6 text-yellow-500" />
                    ) : (
                      <Droplets className="h-6 w-6 text-blue-500" />
                    )}
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        พบการใช้{alert.type === "electricity" ? "ไฟฟ้า" : "น้ำ"}
                        ผิดปกติ
                      </p>
                      <p className="text-sm text-gray-500">
                        {alert.dormitoryName} ห้อง {alert.roomNumber}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(
                      alert.status
                    )}`}
                  >
                    {getStatusText(alert.status)}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center text-sm text-gray-500">
                    พบการใช้งาน {alert.unitsUsed} หน่วย ในห้องว่าง
                  </div>
                  {alert.investigatedBy && (
                    <div className="mt-1 text-sm text-gray-500">
                      ผู้ตรวจสอบ: {alert.investigatedBy}
                    </div>
                  )}
                  {alert.resolution && (
                    <div className="mt-1 text-sm text-gray-500">
                      ผลการตรวจสอบ: {alert.resolution}
                    </div>
                  )}
                  {alert.photoUrl && (
                    <div className="mt-2 flex items-center text-sm text-blue-600">
                      <Camera className="h-4 w-4 mr-1" />
                      ดูรูปภาพ
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    ตรวจพบ: {alert.detectedAt}
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {alerts.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          ไม่พบการแจ้งเตือนทุจริต
        </div>
      )}
    </div>
  );
} 