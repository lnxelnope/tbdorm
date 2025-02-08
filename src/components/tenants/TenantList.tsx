"use client";

import { useState } from "react";
import { Dormitory, Tenant } from "@/types/dormitory";
import EditTenantModal from "./EditTenantModal";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Loader2, Plus } from "lucide-react";
import { deleteTenant, deleteMultipleTenants, queryTenants } from "@/lib/firebase/firebaseUtils";
import Link from "next/link";
import { calculateTotalPrice } from "@/app/dormitories/[id]/rooms/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TenantListProps {
  dormitories: Dormitory[];
  tenants: Tenant[];
  selectedDormitory: string;
  searchQuery: string;
  statusFilter: string;
  onAddClick: () => void;
}

type SortField = 'name' | 'dormitory' | 'roomNumber' | 'startDate' | 'deposit' | 'numberOfResidents' | 'rent';

export default function TenantList({
  dormitories,
  tenants: initialTenants,
  selectedDormitory,
  searchQuery,
  statusFilter,
  onAddClick,
}: TenantListProps) {
  const [tenants, setTenants] = useState(initialTenants);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    direction: 'asc' | 'desc';
  }>({
    field: 'name',
    direction: 'asc'
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTenants(filteredTenants.map(tenant => tenant.id));
    } else {
      setSelectedTenants([]);
    }
  };

  const handleSelectTenant = (tenantId: string) => {
    setSelectedTenants(prev => {
      if (prev.includes(tenantId)) {
        return prev.filter(id => id !== tenantId);
      } else {
        return [...prev, tenantId];
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedTenants.length === 0) return;
    
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้เช่าที่เลือกทั้งหมด ${selectedTenants.length} คน?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      // ต้องมี dormitoryId เดียวกันทั้งหมดจึงจะลบได้
      const firstTenant = tenants.find(t => t.id === selectedTenants[0]);
      if (!firstTenant) return;

      const result = await deleteMultipleTenants(firstTenant.dormitoryId, selectedTenants);
      
      if (result.success) {
        toast.success(`ลบผู้เช่าที่เลือกทั้งหมด ${selectedTenants.length} คนเรียบร้อยแล้ว`);
        setSelectedTenants([]);
        // TODO: Refresh tenant list from parent component
      } else {
        toast.error("เกิดข้อผิดพลาดในการลบผู้เช่า");
      }
    } catch (error) {
      console.error("Error deleting tenants:", error);
      toast.error("เกิดข้อผิดพลาดในการลบผู้เช่า");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบผู้เช่านี้?")) {
      return;
    }

    try {
      setIsDeleting(true);
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return;

      const result = await deleteTenant(tenant.dormitoryId, tenantId);
      
      if (result.success) {
        toast.success("ลบผู้เช่าเรียบร้อยแล้ว");
        // TODO: Refresh tenant list from parent component
      } else {
        toast.error("เกิดข้อผิดพลาดในการลบผู้เช่า");
      }
    } catch (error) {
      console.error("Error deleting tenant:", error);
      toast.error("เกิดข้อผิดพลาดในการลบผู้เช่า");
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateRent = (tenant: Tenant, dormitory: Dormitory | undefined) => {
    if (!dormitory?.config?.roomTypes) return 0;

    const room = {
      id: `${tenant.dormitoryId}_${tenant.roomNumber}`,
      dormitoryId: tenant.dormitoryId,
      number: tenant.roomNumber,
      floor: parseInt(tenant.roomNumber.substring(0, 1)),
      status: 'occupied' as const,
      roomType: Object.values(dormitory.config.roomTypes).find(type => type.isDefault)?.id || '',
      hasAirConditioner: false,
      hasParking: false,
    };

    const roomType = Object.values(dormitory.config.roomTypes).find(type => type.isDefault);
    if (!roomType) return 0;

    const config = {
      additionalFees: {
        airConditioner: dormitory.config.additionalFees?.airConditioner || null,
        parking: dormitory.config.additionalFees?.parking || null,
        floorRates: dormitory.config.additionalFees?.floorRates || {},
        utilities: {
          water: {
            perPerson: dormitory.config.additionalFees?.utilities?.water?.perPerson || null
          },
          electric: {
            unit: dormitory.config.additionalFees?.utilities?.electric?.unit || null
          }
        }
      }
    };

    return calculateTotalPrice(room, [roomType], config);
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesDormitory =
      selectedDormitory === "" || tenant.dormitoryId === selectedDormitory;
    const matchesSearch =
      searchQuery === "" ||
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone.includes(searchQuery) ||
      tenant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.roomNumber.includes(searchQuery);

    return matchesDormitory && matchesSearch;
  }).sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    
    switch (sortConfig.field) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'dormitory':
        const dormA = dormitories.find(d => d.id === a.dormitoryId)?.name || '';
        const dormB = dormitories.find(d => d.id === b.dormitoryId)?.name || '';
        return direction * dormA.localeCompare(dormB);
      case 'roomNumber':
        return direction * a.roomNumber.localeCompare(b.roomNumber);
      case 'startDate':
        return direction * (new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      case 'deposit':
        return direction * (a.deposit - b.deposit);
      case 'numberOfResidents':
        return direction * (a.numberOfResidents - b.numberOfResidents);
      case 'rent':
        const rentA = calculateRent(a, dormitories.find(d => d.id === a.dormitoryId));
        const rentB = calculateRent(b, dormitories.find(d => d.id === b.dormitoryId));
        return direction * (rentA - rentB);
      default:
        return 0;
    }
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {selectedTenants.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">
              เลือก {selectedTenants.length} รายการ
            </span>
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-4 py-2 disabled:opacity-50"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบที่เลือก
            </button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้เช่า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTenants.length === filteredTenants.length}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">
                เลือกทั้งหมด ({selectedTenants.length}/{filteredTenants.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedTenants.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  ลบที่เลือก
                </button>
              )}
              <button
                onClick={onAddClick}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                เพิ่มผู้เช่า
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="sr-only">Select</span>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    ชื่อ-นามสกุล
                    <SortIcon field="name" />
                  </th>
                  <th
                    onClick={() => handleSort('dormitory')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    หอพัก
                    <SortIcon field="dormitory" />
                  </th>
                  <th
                    onClick={() => handleSort('roomNumber')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    เลขห้อง
                    <SortIcon field="roomNumber" />
                  </th>
                  <th
                    onClick={() => handleSort('startDate')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    วันที่เข้าพัก
                    <SortIcon field="startDate" />
                  </th>
                  <th
                    onClick={() => handleSort('deposit')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    เงินประกัน
                    <SortIcon field="deposit" />
                  </th>
                  <th
                    onClick={() => handleSort('rent')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    ค่าเช่า/เดือน
                    <SortIcon field="rent" />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTenants.map((tenant) => {
                  const dormitory = dormitories.find(
                    (d) => d.id === tenant.dormitoryId
                  );
                  const rent = calculateRent(tenant, dormitory);

                  return (
                    <tr key={tenant.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTenants.includes(tenant.id)}
                          onChange={() => handleSelectTenant(tenant.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{tenant.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {dormitory?.name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <Link 
                            href={`/dormitories/${tenant.dormitoryId}/rooms/${tenant.roomNumber}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {tenant.roomNumber}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(tenant.startDate).toLocaleDateString("th-TH")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {tenant.deposit.toLocaleString()} บาท
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {rent.toLocaleString()} บาท
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedTenant(tenant)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(tenant.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedTenant && (
        <EditTenantModal
          isOpen={!!selectedTenant}
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onSuccess={() => {
            setSelectedTenant(null);
            // Refresh tenant list
            const loadTenants = async () => {
              try {
                const result = await queryTenants(selectedDormitory);
                if (result.success && result.data) {
                  setTenants(result.data);
                }
              } catch (error) {
                console.error("Error loading tenants:", error);
                toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า");
              }
            };
            loadTenants();
          }}
          dormitories={dormitories}
        />
      )}
    </div>
  );
} 