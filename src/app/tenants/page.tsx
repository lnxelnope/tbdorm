"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { queryDormitories, queryTenants } from "@/lib/firebase/firebaseUtils";
import type { Dormitory, Tenant } from "@/types/dormitory";
import TenantList from "@/components/tenants/TenantList";
import AddTenantModal from "@/components/tenants/AddTenantModal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TenantsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // โหลดข้อมูลเริ่มต้น
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [dormitoriesResult, tenantsResult] = await Promise.all([
        queryDormitories(),
        queryTenants()
      ]);

      if (dormitoriesResult.success && dormitoriesResult.data) {
        setDormitories(dormitoriesResult.data);
      }

      if (tenantsResult.success && tenantsResult.data) {
        setTenants(tenantsResult.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // โหลดข้อมูลผู้เช่าตามหอพักที่เลือก
  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const result = await queryTenants(selectedDormitory);
      if (result.success && result.data) {
        setTenants(result.data);
      }
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, [selectedDormitory]);

  // ฟังก์ชันส่งออกข้อมูลเป็น CSV
  const handleExportCSV = () => {
    try {
      const headers = ["ชื่อ-นามสกุล", "เลขห้อง", "เบอร์โทรศัพท์", "Line ID", "วันที่เข้าพัก"];
      const csvData = tenants.map(tenant => [
        tenant.name,
        tenant.roomNumber,
        tenant.phone,
        tenant.lineId,
        new Date(tenant.startDate).toLocaleDateString('th-TH')
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `tenants_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success("ส่งออกข้อมูลเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-white/60">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="container mx-auto py-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold text-white">รายชื่อผู้เช่า</CardTitle>
            <CardDescription className="text-gray-500">
              รายการแสดงผู้เช่าทั้งหมดในระบบ สามารถค้นหา กรอง
              และดูรายละเอียดของผู้เช่าแต่ละคนได้
            </CardDescription>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มผู้เช่า
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-white/40" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาผู้เช่า..."
                className="block w-full rounded-lg border-0 bg-white/5 py-2 pl-10 pr-4 text-white placeholder:text-white/40 focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-white/40" />
                <select
                  value={selectedDormitory}
                  onChange={(e) => setSelectedDormitory(e.target.value)}
                  className="block w-full rounded-lg border-0 bg-white/5 py-2 pl-3 pr-10 text-white focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
                >
                  <option value="">ทุกหอพัก</option>
                  {dormitories.map((dormitory) => (
                    <option key={dormitory.id} value={dormitory.id}>
                      {dormitory.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
              >
                <Download className="mr-2 h-4 w-4" />
                ส่งออก CSV
              </button>
            </div>
          </div>

          <TenantList
            dormitories={dormitories}
            tenants={tenants}
            selectedDormitory={selectedDormitory}
            searchQuery={searchQuery}
            statusFilter=""
          />
        </div>
      </CardContent>

      <AddTenantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        dormitories={dormitories}
        onSuccess={loadTenants}
      />
    </Card>
  );
} 