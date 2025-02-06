"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import { queryDormitories, queryTenants } from "@/lib/firebase/firebaseUtils";
import type { Dormitory, Tenant } from "@/types/dormitory";
import TenantList from "@/components/tenants/TenantList";
import AddTenantModal from "@/components/tenants/AddTenantModal";

interface LocalTenant extends Omit<Tenant, 'currentAddress'> {
  currentAddress: string;
}

export default function TenantsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [tenants, setTenants] = useState<LocalTenant[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dormitoriesResult, tenantsResult] = await Promise.all([
          queryDormitories(),
          queryTenants()
        ]);

        if (dormitoriesResult.success && dormitoriesResult.data) {
          setDormitories(dormitoriesResult.data);
        } else {
          toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
        }

        if (tenantsResult.success && tenantsResult.data) {
          setTenants(tenantsResult.data as LocalTenant[]);
        } else {
          toast.error("ไม่สามารถโหลดข้อมูลผู้เช่าได้");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshTenants = async () => {
    try {
      setIsLoading(true);
      const result = await queryTenants(selectedDormitory);
      if (result.success && result.data) {
        const tenantsWithAddress = result.data.map(tenant => ({
          ...tenant,
          currentAddress: tenant.currentAddress || ""
        })) as LocalTenant[];
        setTenants(tenantsWithAddress);
      }
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshTenants();
  }, [selectedDormitory]);

  const handleExportCSV = () => {
    // TODO: Export tenant data to CSV
    toast.success("ส่งออกข้อมูลเรียบร้อยแล้ว");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">รายชื่อผู้เช่า</h1>
          <p className="mt-2 text-sm text-gray-700">
            รายการแสดงผู้เช่าทั้งหมดในระบบ สามารถค้นหา กรอง
            และดูรายละเอียดของผู้เช่าแต่ละคนได้
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มผู้เช่า
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาผู้เช่า..."
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedDormitory}
              onChange={(e) => setSelectedDormitory(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
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
            className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
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

      <AddTenantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        dormitories={dormitories}
        onSuccess={refreshTenants}
      />
    </div>
  );
} 