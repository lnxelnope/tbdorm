"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { toast } from "sonner";
import { Building, Users, FileText, AlertTriangle } from "lucide-react";
import DashboardCard from "@/components/dashboard/DashboardCard";
import DormitoryList from "@/components/dashboard/DormitoryList";
import RecentActivities from "@/components/dashboard/RecentActivities";
import FraudAlerts from "@/components/dashboard/FraudAlerts";

interface DashboardStats {
  totalDormitories: number;
  totalTenants: number;
  unpaidBills: number;
  pendingFraudAlerts: number;
  trends: {
    dormitories: number;
    tenants: number;
    unpaidBills: number;
    fraudAlerts: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDormitories: 0,
    totalTenants: 0,
    unpaidBills: 0,
    pendingFraudAlerts: 0,
    trends: {
      dormitories: 0,
      tenants: 0,
      unpaidBills: 0,
      fraudAlerts: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // โหลดจำนวนหอพักทั้งหมด
      const dormitoriesSnapshot = await getDocs(collection(db, "dormitories"));
      const totalDormitories = dormitoriesSnapshot.size;

      // โหลดจำนวนหอพักเดือนที่แล้ว
      const lastMonthDormitoriesQuery = query(
        collection(db, "dormitories"),
        where("createdAt", "<", firstDayOfMonth)
      );
      const lastMonthDormitoriesSnapshot = await getDocs(lastMonthDormitoriesQuery);
      const lastMonthDormitories = lastMonthDormitoriesSnapshot.size;

      // โหลดจำนวนผู้เช่าทั้งหมด
      const tenantsQuery = query(
        collection(db, "tenants"),
        where("status", "==", "active")
      );
      const tenantsSnapshot = await getDocs(tenantsQuery);
      const totalTenants = tenantsSnapshot.size;

      // โหลดจำนวนผู้เช่าเดือนที่แล้ว
      const lastMonthTenantsQuery = query(
        collection(db, "tenants"),
        where("status", "==", "active"),
        where("createdAt", "<", firstDayOfMonth)
      );
      const lastMonthTenantsSnapshot = await getDocs(lastMonthTenantsQuery);
      const lastMonthTenants = lastMonthTenantsSnapshot.size;

      // โหลดจำนวนบิลที่ยังไม่ได้ชำระ
      const unpaidBillsQuery = query(
        collection(db, "bills"),
        where("status", "==", "pending"),
        where("dueDate", ">=", firstDayOfMonth),
        where("dueDate", "<", firstDayOfNextMonth)
      );
      const unpaidBillsSnapshot = await getDocs(unpaidBillsQuery);
      const unpaidBills = unpaidBillsSnapshot.size;

      // โหลดจำนวนบิลที่ยังไม่ได้ชำระเดือนที่แล้ว
      const lastMonthUnpaidBillsQuery = query(
        collection(db, "bills"),
        where("status", "==", "pending"),
        where("dueDate", ">=", firstDayOfLastMonth),
        where("dueDate", "<", firstDayOfMonth)
      );
      const lastMonthUnpaidBillsSnapshot = await getDocs(lastMonthUnpaidBillsQuery);
      const lastMonthUnpaidBills = lastMonthUnpaidBillsSnapshot.size;

      // โหลดจำนวนการแจ้งเตือนทุจริตที่รอดำเนินการ
      const pendingFraudAlertsQuery = query(
        collection(db, "fraud_alerts"),
        where("status", "in", ["pending", "investigating"]),
        where("createdAt", ">=", firstDayOfMonth),
        where("createdAt", "<", firstDayOfNextMonth)
      );
      const pendingFraudAlertsSnapshot = await getDocs(pendingFraudAlertsQuery);
      const pendingFraudAlerts = pendingFraudAlertsSnapshot.size;

      const lastMonthPendingFraudAlertsQuery = query(
        collection(db, "fraud_alerts"),
        where("status", "in", ["pending", "investigating"]),
        where("createdAt", ">=", firstDayOfLastMonth),
        where("createdAt", "<", firstDayOfMonth)
      );
      const lastMonthPendingFraudAlertsSnapshot = await getDocs(lastMonthPendingFraudAlertsQuery);
      const lastMonthPendingFraudAlerts = lastMonthPendingFraudAlertsSnapshot.size;

      // คำนวณ trends
      const calculateTrendPercentage = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const trends = {
        dormitories: calculateTrendPercentage(totalDormitories, lastMonthDormitories),
        tenants: calculateTrendPercentage(totalTenants, lastMonthTenants),
        unpaidBills: calculateTrendPercentage(unpaidBills, lastMonthUnpaidBills),
        fraudAlerts: calculateTrendPercentage(pendingFraudAlerts, lastMonthPendingFraudAlerts),
      };

      setStats({
        totalDormitories,
        totalTenants,
        unpaidBills,
        pendingFraudAlerts,
        trends,
      });
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-500">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            แผงควบคุม
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            ภาพรวมของระบบจัดการหอพัก
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="หอพักทั้งหมด"
              value={stats.totalDormitories}
              icon={Building}
              trend={{
                value: stats.trends.dormitories,
                label: "จากเดือนที่แล้ว",
                direction: stats.trends.dormitories > 0 ? "up" : stats.trends.dormitories < 0 ? "down" : "stable"
              }}
            />
            <DashboardCard
              title="ผู้เช่าทั้งหมด"
              value={stats.totalTenants}
              icon={Users}
              trend={{
                value: stats.trends.tenants,
                label: "จากเดือนที่แล้ว",
                direction: stats.trends.tenants > 0 ? "up" : stats.trends.tenants < 0 ? "down" : "stable"
              }}
            />
            <DashboardCard
              title="บิลที่ยังไม่ชำระ"
              value={stats.unpaidBills}
              icon={FileText}
              trend={{
                value: stats.trends.unpaidBills,
                label: "จากเดือนที่แล้ว",
                direction: stats.trends.unpaidBills > 0 ? "up" : stats.trends.unpaidBills < 0 ? "down" : "stable"
              }}
            />
            <DashboardCard
              title="การแจ้งเตือนทุจริต"
              value={stats.pendingFraudAlerts}
              icon={AlertTriangle}
              trend={{
                value: stats.trends.fraudAlerts,
                label: "จากเดือนที่แล้ว",
                direction: stats.trends.fraudAlerts > 0 ? "up" : stats.trends.fraudAlerts < 0 ? "down" : "stable"
              }}
            />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left Column */}
            <div className="grid grid-cols-1 gap-8">
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold leading-7 text-gray-900">
                      รายการหอพัก
                    </h2>
                    <a
                      href="/dormitories"
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      ดูทั้งหมด →
                    </a>
                  </div>
                  <div className="mt-6">
                    <DormitoryList />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="grid grid-cols-1 gap-8">
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold leading-7 text-gray-900">
                      กิจกรรมล่าสุด
                    </h2>
                    <a
                      href="/activities"
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      ดูทั้งหมด →
                    </a>
                  </div>
                  <div className="mt-6">
                    <RecentActivities />
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold leading-7 text-gray-900">
                      การแจ้งเตือนทุจริต
                    </h2>
                    <a
                      href="/fraud-alerts"
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      ดูทั้งหมด →
                    </a>
                  </div>
                  <div className="mt-6">
                    <FraudAlerts />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
