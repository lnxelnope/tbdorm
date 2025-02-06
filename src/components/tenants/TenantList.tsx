"use client";

import { useState } from "react";
import { Dormitory } from "@/types/dormitory";
import EditTenantModal from "./EditTenantModal";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { deleteTenant, deleteMultipleTenants } from "@/lib/firebase/firebaseUtils";
import Link from "next/link";
import { calculateTotalPrice } from "@/app/dormitories/[id]/rooms/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Tenant {
  id: string;
  name: string;
  idCard: string;
  phone: string;
  email: string;
  lineId: string;
  currentAddress: string;
  dormitoryId: string;
  roomNumber: string;
  startDate: string;
  deposit: number;
  numberOfResidents: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

interface TenantListProps {
  dormitories: Dormitory[];
  tenants: Tenant[];
  selectedDormitory: string;
  searchQuery: string;
  statusFilter: string;
}

type SortField = 'name' | 'dormitory' | 'roomNumber' | 'startDate' | 'deposit' | 'numberOfResidents' | 'rent';

export default function TenantList({
  dormitories,
  tenants,
  selectedDormitory,
  searchQuery,
  statusFilter,
}: TenantListProps) {
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
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedTenants.length === filteredTenants.length && filteredTenants.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-input bg-background"
                    />
                  </th>
                  <th 
                    scope="col" 
                    className="p-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      ชื่อ-นามสกุล
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="p-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('dormitory')}
                  >
                    <div className="flex items-center gap-1">
                      หอพัก
                      <SortIcon field="dormitory" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="p-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('roomNumber')}
                  >
                    <div className="flex items-center gap-1">
                      ห้อง
                      <SortIcon field="roomNumber" />
                    </div>
                  </th>
                  <th scope="col" className="p-3 text-left text-sm font-medium text-muted-foreground">
                    Line ID
                  </th>
                  <th
                    scope="col"
                    className="p-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('deposit')}
                  >
                    <div className="flex items-center gap-1">
                      เงินประกัน
                      <SortIcon field="deposit" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="p-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('numberOfResidents')}
                  >
                    <div className="flex items-center gap-1">
                      จำนวนผู้พัก
                      <SortIcon field="numberOfResidents" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="p-3 text-left text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort('rent')}
                  >
                    <div className="flex items-center gap-1">
                      ค่าเช่า/เดือน
                      <SortIcon field="rent" />
                    </div>
                  </th>
                  <th scope="col" className="relative p-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTenants.map((tenant) => {
                  const dormitory = dormitories.find(
                    (d) => d.id === tenant.dormitoryId
                  );
                  return (
                    <tr 
                      key={tenant.id}
                      className="bg-background hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedTenants.includes(tenant.id)}
                          onChange={() => handleSelectTenant(tenant.id)}
                          className="h-4 w-4 rounded border-input bg-background"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/tenants/${tenant.id}`}
                            className="text-sm font-medium leading-none text-muted-foreground hover:text-foreground"
                          >
                            {tenant.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/dormitories/${tenant.dormitoryId}`}
                            className="text-sm font-medium leading-none text-muted-foreground hover:text-foreground"
                          >
                            {dormitories.find((d) => d.id === tenant.dormitoryId)?.name}
                          </Link>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={`/dormitories/${tenant.dormitoryId}/rooms?search=${tenant.roomNumber}`}
                            className="text-sm font-medium leading-none text-muted-foreground hover:text-foreground"
                          >
                            {tenant.roomNumber}
                          </Link>
                        </div>
                      </td>
                      <td className="p-3">
                        {tenant.lineId}
                      </td>
                      <td className="p-3">
                        {tenant.deposit.toLocaleString("th-TH")} บาท
                      </td>
                      <td className="p-3">
                        {tenant.numberOfResidents} คน
                      </td>
                      <td className="p-3">
                        {calculateRent(tenant, dormitory).toLocaleString("th-TH")} บาท
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedTenant(tenant)}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-8 px-3"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            disabled={isDeleting}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-8 px-3 disabled:opacity-50"
                          >
                            ลบ
                          </button>
                        </div>
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
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          dormitories={dormitories}
        />
      )}
    </div>
  );
} 