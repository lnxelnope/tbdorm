"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { queryDormitories, queryTenants, deleteTenant } from "@/lib/firebase/firebaseUtils";
import type { Dormitory, Tenant, DormitoryConfig, RoomType } from "@/types/dormitory";
import TenantList from "@/components/tenants/TenantList";
import AddTenantModal from "@/components/tenants/AddTenantModal";
import DeleteTenantModal from "@/components/tenants/DeleteTenantModal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import EditTenantModal from "@/components/tenants/EditTenantModal";
import TenantDetailsModal from "@/app/components/tenants/TenantDetailsModal";

interface DormitoryData extends Omit<Dormitory, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

interface TenantData extends Omit<Tenant, 'startDate' | 'endDate' | 'createdAt' | 'updatedAt' | 'emergencyContact'> {
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  currentRent?: number;
}

export default function TenantsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitories, setDormitories] = useState<DormitoryData[]>([]);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'roomNumber',
    direction: 'asc'
  });
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const loadDormitories = async () => {
    try {
      const result = await queryDormitories();
      if (result.success && result.data) {
        const dormitoriesWithTotalFloors = result.data.map((dorm: Dormitory) => ({
          ...dorm,
          totalFloors: dorm.config?.additionalFees?.floorRates ? 
            Object.keys(dorm.config.additionalFees.floorRates).length : 
            1
        }));
        setDormitories(dormitoriesWithTotalFloors);
      }
    } catch (error) {
      console.error("Error loading dormitories:", error);
      toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
    }
  };

  const loadTenants = async () => {
    try {
      const result = await queryTenants(selectedDormitory);
      if (result.success && result.data) {
        const tenantsData = result.data.map(tenant => {
          const data: TenantData = {
            id: tenant.id,
            name: tenant.name,
            lineId: tenant.lineId || "",
            idCard: tenant.idCard || "",
            phone: tenant.phone || "",
            email: tenant.email || "",
            currentAddress: tenant.currentAddress || "",
            workplace: tenant.workplace || "",
            dormitoryId: tenant.dormitoryId || "",
            roomId: tenant.roomId || "",
            roomNumber: tenant.roomNumber || "",
            deposit: tenant.deposit || 0,
            startDate: tenant.startDate?.toString() || new Date().toISOString(),
            endDate: tenant.endDate?.toString(),
            status: tenant.status || "active",
            createdAt: tenant.createdAt?.toString() || new Date().toISOString(),
            updatedAt: tenant.updatedAt?.toString() || new Date().toISOString(),
            numberOfResidents: tenant.numberOfResidents || 1,
            numberOfOccupants: tenant.numberOfResidents || 1,
            rentAdvance: tenant.rentAdvance || 0,
            emergencyContact: typeof tenant.emergencyContact === 'string' 
              ? { name: "", relationship: "", phone: tenant.emergencyContact }
              : tenant.emergencyContact || { name: "", relationship: "", phone: "" },
            outstandingBalance: tenant.outstandingBalance || 0
          };
          return data;
        });
        setTenants(tenantsData);
      }
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast.error("Failed to load tenants");
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

  const handleEdit = (tenant: TenantData) => {
    setSelectedTenant(tenant);
    setIsEditModalOpen(true);
  };

  const handleDelete = (tenant: TenantData) => {
    setSelectedTenant(tenant);
    setIsDeleteModalOpen(true);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortData = (data: TenantData[]) => {
    return [...data].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'roomNumber':
          return direction * a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
        case 'currentRent':
          return direction * ((a.currentRent || 0) - (b.currentRent || 0));
        case 'outstandingBalance':
          return direction * (a.outstandingBalance - b.outstandingBalance);
        default:
          return 0;
      }
    });
  };

  const handleTenantClick = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">รายชื่อผู้เช่า</h1>
          <p className="mt-1 text-sm text-gray-500">จัดการข้อมูลผู้เช่าทั้งหมด</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
        >
          <Plus className="w-5 h-5 mr-2" />
          เพิ่มผู้เช่า
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ตารางรายชื่อผู้เช่า</CardTitle>
              <CardDescription>แสดงข้อมูลผู้เช่าทั้งหมด</CardDescription>
            </div>
          </div>
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

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('roomNumber')}>
                      เลขห้อง
                      {sortConfig.key === 'roomNumber' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อ-นามสกุล
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จำนวนผู้พักอาศัย
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('currentRent')}>
                      ค่าเช่าเดือนนี้
                      {sortConfig.key === 'currentRent' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('outstandingBalance')}>
                      ค่าเช่าค้างจ่าย
                      {sortConfig.key === 'outstandingBalance' && (
                        <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    sortData(tenants
                      .filter(tenant => {
                        if (!searchQuery) return true;
                        const searchLower = searchQuery.toLowerCase();
                        return (
                          tenant.name?.toLowerCase().includes(searchLower) ||
                          tenant.roomNumber?.toLowerCase().includes(searchLower)
                        );
                      }))
                      .map((tenant) => (
                        <tr key={tenant.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {tenant.roomNumber.padStart(3, '0')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <button
                              onClick={() => handleTenantClick(tenant.id)}
                              className="text-blue-600 hover:text-blue-900 hover:underline"
                            >
                              {tenant.name}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tenant.numberOfOccupants || 1} คน
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(tenant.currentRent || 0).toLocaleString()} บาท
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tenant.outstandingBalance.toLocaleString()} บาท
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              tenant.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : tenant.status === 'moving_out'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {tenant.status === 'active' ? 'อยู่ประจำ' : tenant.status === 'moving_out' ? 'กำลังย้ายออก' : 'ออกจากหอพัก'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(tenant)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => handleDelete(tenant)}
                                className="text-red-600 hover:text-red-900"
                              >
                                ลบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
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

      {selectedTenant && (
        <EditTenantModal
          isOpen={isEditModalOpen}
          tenant={selectedTenant}
          onClose={() => {
            setSelectedTenant(null);
            setIsEditModalOpen(false);
          }}
          onSuccess={() => {
            setSelectedTenant(null);
            setIsEditModalOpen(false);
            loadTenants();
          }}
          dormitories={dormitories}
        />
      )}

      {selectedTenantId && (
        <TenantDetailsModal
          isOpen={!!selectedTenantId}
          onClose={() => setSelectedTenantId(null)}
          dormitoryId={dormitories.find(d => d.id === selectedTenantId)?.id || ""}
          tenantId={selectedTenantId}
        />
      )}

      <DeleteTenantModal
        isOpen={isDeleteModalOpen}
        tenant={selectedTenant}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTenant(null);
        }}
        onSuccess={() => {
          setIsDeleteModalOpen(false);
          setSelectedTenant(null);
          loadTenants();
          toast.success("ลบผู้เช่าเรียบร้อยแล้ว");
        }}
      />
    </div>
  );
} 