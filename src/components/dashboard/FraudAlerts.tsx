"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface FraudAlert {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  timestamp: string;
  dormitoryId: string;
  dormitoryName: string;
  status: "pending" | "investigating" | "resolved";
}

const getSeverityColor = (severity: FraudAlert["severity"]) => {
  switch (severity) {
    case "high":
      return "text-red-700 bg-red-50 ring-red-600/20";
    case "medium":
      return "text-yellow-700 bg-yellow-50 ring-yellow-600/20";
    case "low":
      return "text-blue-700 bg-blue-50 ring-blue-600/20";
    default:
      return "text-gray-700 bg-gray-50 ring-gray-600/20";
  }
};

const getStatusColor = (status: FraudAlert["status"]) => {
  switch (status) {
    case "pending":
      return "text-red-700 bg-red-50 ring-red-600/10";
    case "investigating":
      return "text-yellow-700 bg-yellow-50 ring-yellow-600/10";
    case "resolved":
      return "text-green-700 bg-green-50 ring-green-600/10";
    default:
      return "text-gray-700 bg-gray-50 ring-gray-600/10";
  }
};

const getStatusText = (status: FraudAlert["status"]) => {
  switch (status) {
    case "pending":
      return "รอดำเนินการ";
    case "investigating":
      return "กำลังตรวจสอบ";
    case "resolved":
      return "ดำเนินการแล้ว";
    default:
      return status;
  }
};

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const q = query(
        collection(db, "fraud_alerts"),
        where("status", "in", ["pending", "investigating"]),
        orderBy("timestamp", "desc"),
        limit(5)
      );
      
      const snapshot = await getDocs(q);
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FraudAlert[];
      
      setAlerts(alertsData);
    } catch (error) {
      console.error("Error loading fraud alerts:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลการแจ้งเตือน");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">ไม่มีการแจ้งเตือนที่ต้องดำเนินการ</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="divide-y divide-gray-100">
        {alerts.map((alert) => (
          <li key={alert.id} className="relative py-5">
            <div className="flex justify-between gap-x-6">
              <div className="flex min-w-0 gap-x-4">
                <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-lg ${getSeverityColor(alert.severity)}`}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="text-sm font-semibold leading-6 text-gray-900">
                    <span className="absolute inset-x-0 -top-px bottom-0" />
                    {alert.title}
                  </p>
                  <p className="mt-1 flex text-xs leading-5 text-gray-500">
                    <span className="relative truncate">
                      {alert.description}
                    </span>
                  </p>
                  <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                    <p className="whitespace-nowrap">
                      {format(new Date(alert.timestamp), "PPp", { locale: th })}
                    </p>
                    <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                      <circle cx={1} cy={1} r={1} />
                    </svg>
                    <p className="truncate">{alert.dormitoryName}</p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-x-4">
                <div className="hidden sm:flex sm:flex-col sm:items-end">
                  <p className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(alert.status)}`}>
                    {getStatusText(alert.status)}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 