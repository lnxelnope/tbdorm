"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { queryDormitories, queryTenants } from "@/lib/firebase/firebaseUtils";
import type { Dormitory, Tenant, SimplifiedDormitory } from "@/types/dormitory";
import TenantList from "@/components/tenants/TenantList";
import AddTenantModal from "@/components/tenants/AddTenantModal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TenantsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitories, setDormitories] = useState<SimplifiedDormitory[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadDormitories = async () => {
    try {
      const result = await queryDormitories();
      if (result.success && result.data) {
        const simplifiedDormitories = result.data.map(dormitory => ({
          id: dormitory.id,
          name: dormitory.name,
          config: dormitory.config ? {
            roomTypes: dormitory.config.roomTypes,
            additionalFees: dormitory.config.additionalFees
          } : undefined
        }));
        setDormitories(simplifiedDormitories);
      }
    } catch (error) {
      console.error("Error loading dormitories:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก");
    }
  };

  const loadTenants = async () => {
    try {
      const result = await queryTenants(selectedDormitory);
      if (result.success && result.data) {
        const serializedTenants = result.data.map(tenant => ({
          ...tenant,
          startDate: tenant.startDate.toString(),
          createdAt: tenant.createdAt?.toString(),
          updatedAt: tenant.updatedAt?.toString()
        }));
        setTenants(serializedTenants);
      }
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadDormitories(), loadTenants()]);
      setIsLoading(false);
    };
    loadData();
  }, [selectedDormitory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้เช่า</CardTitle>
          <CardDescription>จัดการข้อมูลผู้เช่าทั้งหมด</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="dormitory" className="block text-sm font-medium text-gray-700 mb-1">
                  หอพัก
                </label>
                <select
                  id="dormitory"
                  value={selectedDormitory}
                  onChange={(e) => setSelectedDormitory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">ทั้งหมด</option>
                  {dormitories.map((dormitory) => (
                    <option key={dormitory.id} value={dormitory.id}>
                      {dormitory.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  ค้นหา
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, อีเมล หรือเลขห้อง"
                  />
                </div>
              </div>
            </div>

            <TenantList
              dormitories={dormitories}
              tenants={tenants}
              selectedDormitory={selectedDormitory}
              searchQuery={searchQuery}
              statusFilter=""
              onAddClick={() => setIsAddModalOpen(true)}
            />
          </div>
        </CardContent>
      </Card>

      <AddTenantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        dormitories={dormitories}
        onSuccess={() => {
          setIsAddModalOpen(false);
          loadTenants();
        }}
      />
    </div>
  );
} 