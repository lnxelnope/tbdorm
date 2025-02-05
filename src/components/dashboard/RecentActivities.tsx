"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { FileText, UserPlus, Home, Wrench, AlertTriangle } from "lucide-react";

interface Activity {
  id: string;
  type: "bill_created" | "tenant_added" | "room_maintenance" | "payment_received" | "fraud_detected";
  title: string;
  description: string;
  timestamp: string;
  dormitoryId: string;
  dormitoryName: string;
}

const getActivityIcon = (type: Activity["type"]) => {
  switch (type) {
    case "bill_created":
      return FileText;
    case "tenant_added":
      return UserPlus;
    case "room_maintenance":
      return Wrench;
    case "payment_received":
      return Home;
    case "fraud_detected":
      return AlertTriangle;
    default:
      return FileText;
  }
};

const getActivityColor = (type: Activity["type"]) => {
  switch (type) {
    case "bill_created":
      return "text-blue-600 bg-blue-100";
    case "tenant_added":
      return "text-green-600 bg-green-100";
    case "room_maintenance":
      return "text-yellow-600 bg-yellow-100";
    case "payment_received":
      return "text-purple-600 bg-purple-100";
    case "fraud_detected":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

export default function RecentActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const q = query(
        collection(db, "activities"),
        orderBy("timestamp", "desc"),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      
      setActivities(activitiesData);
    } catch (error) {
      console.error("Error loading activities:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลกิจกรรม");
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

  if (activities.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">ไม่มีกิจกรรมล่าสุด</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {activities.map((activity, activityIdx) => {
          const Icon = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type);
          
          return (
            <li key={activity.id}>
              <div className="relative pb-8">
                {activityIdx !== activities.length - 1 ? (
                  <span
                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex items-start space-x-3">
                  <div className={`relative px-1.5 py-1.5 rounded-full ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {activity.description}
                      </p>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>
                        {format(new Date(activity.timestamp), "PPp", { locale: th })}
                        {" • "}
                        {activity.dormitoryName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
} 