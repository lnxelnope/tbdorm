"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { toast } from "sonner";
import { Building2, Users, FileText, AlertTriangle, ArrowUp, ArrowDown, Minus } from "lucide-react";
import DormitoryList from "@/components/dashboard/DormitoryList";
import RecentActivities from "@/components/dashboard/RecentActivities";
import FraudAlerts from "@/components/dashboard/FraudAlerts";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";
import Image from 'next/image';

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
  const { user, loading, signInWithGoogle } = useAuth();
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
    console.log('DashboardPage mounted, user:', user?.email);
    if (!loading && user) {
      loadDashboardStats();
    }
  }, [user, loading]);

  const loadDashboardStats = async () => {
    try {
      console.log('Loading dashboard stats...');
      setIsLoading(true);
      
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
      const billsSnapshot = await getDocs(collection(db, "bills"));
      const unpaidBills = billsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === "pending" && 
               data.dueDate >= firstDayOfMonth && 
               data.dueDate < firstDayOfNextMonth;
      }).length;

      const lastMonthUnpaidBills = billsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === "pending" && 
               data.dueDate >= firstDayOfLastMonth && 
               data.dueDate < firstDayOfMonth;
      }).length;

      // โหลดจำนวนการแจ้งเตือนทุจริตที่รอดำเนินการ
      const fraudAlertsSnapshot = await getDocs(collection(db, "fraud_alerts"));
      const pendingFraudAlerts = fraudAlertsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return ["pending", "investigating"].includes(data.status) && 
               data.createdAt >= firstDayOfMonth && 
               data.createdAt < firstDayOfNextMonth;
      }).length;

      const lastMonthPendingFraudAlerts = fraudAlertsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return ["pending", "investigating"].includes(data.status) && 
               data.createdAt >= firstDayOfLastMonth && 
               data.createdAt < firstDayOfMonth;
      }).length;

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
      
      console.log('Dashboard stats loaded successfully');
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8"></div>
          <p className="mt-2 text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold mx-auto mb-4">
              D
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">ยินดีต้อนรับสู่ระบบจัดการหอพัก</h1>
            <p className="text-slate-600">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
          </div>
          
          <div className="card">
            <button
              onClick={signInWithGoogle}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <Image 
                src="/google.svg" 
                alt="Google" 
                width={20}
                height={20}
                className="w-5 h-5" 
              />
              เข้าสู่ระบบด้วย Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">แผงควบคุม</h1>
          <p className="mt-1 text-sm text-slate-600">
            ภาพรวมของระบบจัดการหอพัก
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">หอพักทั้งหมด</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-slate-900">{stats.totalDormitories}</p>
                    {stats.trends.dormitories !== 0 && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(stats.trends.dormitories)}
                        <span className={`text-sm font-medium ${getTrendColor(stats.trends.dormitories)}`}>
                          {Math.abs(stats.trends.dormitories)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">ผู้เช่าทั้งหมด</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-slate-900">{stats.totalTenants}</p>
                    {stats.trends.tenants !== 0 && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(stats.trends.tenants)}
                        <span className={`text-sm font-medium ${getTrendColor(stats.trends.tenants)}`}>
                          {Math.abs(stats.trends.tenants)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">บิลที่ยังไม่ชำระ</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-slate-900">{stats.unpaidBills}</p>
                    {stats.trends.unpaidBills !== 0 && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(stats.trends.unpaidBills)}
                        <span className={`text-sm font-medium ${getTrendColor(stats.trends.unpaidBills)}`}>
                          {Math.abs(stats.trends.unpaidBills)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">การแจ้งเตือนทุจริต</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-slate-900">{stats.pendingFraudAlerts}</p>
                    {stats.trends.fraudAlerts !== 0 && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(stats.trends.fraudAlerts)}
                        <span className={`text-sm font-medium ${getTrendColor(stats.trends.fraudAlerts)}`}>
                          {Math.abs(stats.trends.fraudAlerts)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left Column */}
            <div className="grid grid-cols-1 gap-8">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-slate-900">รายการหอพัก</h2>
                  <Link href="/dormitories" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    ดูทั้งหมด →
                  </Link>
                </div>
                <div className="mt-6">
                  <DormitoryList />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="grid grid-cols-1 gap-8">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-slate-900">กิจกรรมล่าสุด</h2>
                  <Link href="/activities" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    ดูทั้งหมด →
                  </Link>
                </div>
                <div className="mt-6">
                  <RecentActivities />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-slate-900">การแจ้งเตือนทุจริต</h2>
                  <Link href="/fraud-alerts" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    ดูทั้งหมด →
                  </Link>
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
  );
}
