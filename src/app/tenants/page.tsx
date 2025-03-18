"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, Download, Trash2, UserPlus, Edit, Eye, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { 
  queryDormitories, 
  queryTenants, 
  deleteTenant, 
  getDormitoryConfig 
} from "@/lib/firebase/firebaseUtils";
import type { Dormitory } from "@/types/dormitory";
import type { Tenant } from "@/types/tenant";
import AddTenantModal from "@/components/tenants/AddTenantModal";
import EditTenantModal from "@/components/tenants/EditTenantModal";
import TenantDetailsModal from "@/app/components/tenants/TenantDetailsModal";

// ประเภทข้อมูลสำหรับการจัดเรียง
interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// คอมโพเนนต์ Modal ยืนยันการลบ
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, title, message }: DeleteConfirmModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-6">
          <p className="text-gray-600">{message}</p>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 rounded-md text-sm font-medium text-white hover:bg-red-700"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  // สถานะการโหลดข้อมูล
  const [isLoading, setIsLoading] = useState(true);
  
  // ข้อมูลหอพักและผู้เช่า
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState<string>("");
  
  // สถานะการค้นหาและการจัดเรียง
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'roomNumber',
    direction: 'asc'
  });
  
  // สถานะสำหรับ Modal ต่างๆ
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // โหลดข้อมูลหอพัก
  const loadDormitories = async () => {
    try {
      const result = await queryDormitories();
      if (result.success && result.data) {
        setDormitories(result.data);
        
        // เลือกหอพักแรกโดยอัตโนมัติถ้ายังไม่ได้เลือก
        if (result.data.length > 0 && !selectedDormitory) {
          setSelectedDormitory(result.data[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading dormitories:", error);
      toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
    }
  };

  // โหลดข้อมูลผู้เช่า
  const loadTenants = async () => {
    if (!selectedDormitory) return;
    
    try {
      setIsLoading(true);
      
      // ดึงข้อมูลผู้เช่า
      const result = await queryTenants(selectedDormitory);
      if (!result.success || !result.data) {
        toast.error("ไม่สามารถโหลดข้อมูลผู้เช่าได้");
        setIsLoading(false);
        return;
      }
      
      // ดึงการตั้งค่าหอพัก
      const configResult = await getDormitoryConfig();
      
      // กรองเฉพาะผู้เช่าที่ยังอยู่ในหอพัก
      const activeTenants = result.data.filter(
        tenant => tenant.status === 'active' || tenant.status === 'moving_out'
      );
      
      // จัดรูปแบบข้อมูลผู้เช่า
      const formattedTenants = activeTenants.map(tenant => {
        // คำนวณชั้นจากเลขห้อง
        const floor = parseInt(tenant.roomNumber.charAt(0));
        
        return {
          ...tenant,
          floor,
          // ตั้งค่าเริ่มต้นสำหรับข้อมูลที่อาจไม่มี
          numberOfResidents: tenant.numberOfResidents || 1,
          hasMeterReading: tenant.hasMeterReading || false,
          electricityUsage: tenant.electricityUsage || {
            unitsUsed: 0,
            previousReading: 0,
            currentReading: 0,
            charge: 0
          }
        };
      });
      
      setTenants(formattedTenants);
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า");
    } finally {
      setIsLoading(false);
    }
  };

  // โหลดข้อมูลเมื่อเริ่มต้น
  useEffect(() => {
    loadDormitories();
  }, []);

  // โหลดข้อมูลผู้เช่าเมื่อเลือกหอพัก
  useEffect(() => {
    if (selectedDormitory) {
      loadTenants();
    }
  }, [selectedDormitory]);

  // จัดการการเปลี่ยนหอพัก
  const handleDormitoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDormitory(e.target.value);
  };

  // จัดการการจัดเรียง
  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // กรองและจัดเรียงข้อมูลผู้เช่า
  const filteredAndSortedTenants = useMemo(() => {
    // กรองตามคำค้นหา
    const filtered = tenants.filter(tenant => {
      const searchLower = searchQuery.toLowerCase();
      return (
        tenant.name.toLowerCase().includes(searchLower) ||
        tenant.roomNumber.toLowerCase().includes(searchLower) ||
        tenant.phone?.toLowerCase().includes(searchLower) ||
        tenant.email?.toLowerCase().includes(searchLower)
      );
    });

    // จัดเรียงตามคอลัมน์ที่เลือก
    return [...filtered].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'roomNumber':
          return a.roomNumber.localeCompare(b.roomNumber) * direction;
        case 'name':
          return a.name.localeCompare(b.name) * direction;
        case 'phone':
          return (a.phone || '').localeCompare(b.phone || '') * direction;
        case 'status':
          return a.status.localeCompare(b.status) * direction;
        default:
          return 0;
      }
    });
  }, [tenants, searchQuery, sortConfig]);

  // จัดการการเพิ่มผู้เช่า
  const handleAddTenant = () => {
    setIsAddModalOpen(true);
  };

  // จัดการการแก้ไขผู้เช่า
  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditModalOpen(true);
  };

  // จัดการการลบผู้เช่า
  const handleDeleteTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDeleteModalOpen(true);
  };

  // จัดการการดูรายละเอียดผู้เช่า
  const handleViewTenantDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailsModalOpen(true);
  };

  // จัดการการลบผู้เช่าเมื่อยืนยัน
  const confirmDeleteTenant = async () => {
    if (!selectedTenant || !selectedDormitory) return;
    
    try {
      const result = await deleteTenant(selectedDormitory, selectedTenant.id);
      if (result.success) {
        toast.success("ลบผู้เช่าเรียบร้อยแล้ว");
        loadTenants(); // โหลดข้อมูลใหม่
      } else {
        toast.error("ไม่สามารถลบผู้เช่าได้");
      }
    } catch (error) {
      console.error("Error deleting tenant:", error);
      toast.error("เกิดข้อผิดพลาดในการลบผู้เช่า");
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedTenant(null);
    }
  };

  // จัดการเมื่อเพิ่มหรือแก้ไขผู้เช่าสำเร็จ
  const handleSuccess = () => {
    loadTenants();
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedTenant(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">จัดการผู้เช่า</h1>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label htmlFor="dormitory" className="block text-sm font-medium text-gray-700 mb-1">
                  หอพัก
                </label>
                <select
                  id="dormitory"
                  value={selectedDormitory}
                  onChange={handleDormitoryChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">เลือกหอพัก</option>
                  {dormitories.map((dorm) => (
                    <option key={dorm.id} value={dorm.id}>
                      {dorm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
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

            <div className="flex items-end">
              <button
                onClick={handleAddTenant}
                disabled={!selectedDormitory}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Plus className="h-5 w-5 mr-2" />
                เพิ่มผู้เช่า
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : filteredAndSortedTenants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">ไม่พบข้อมูลผู้เช่า</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('roomNumber')}
                  >
                    เลขห้อง
                    {sortConfig.key === 'roomNumber' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    ชื่อ-นามสกุล
                    {sortConfig.key === 'name' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('phone')}
                  >
                    เบอร์โทรศัพท์
                    {sortConfig.key === 'phone' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จำนวนผู้พักอาศัย
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    สถานะ
                    {sortConfig.key === 'status' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tenant.roomNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleViewTenantDetails(tenant)}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {tenant.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.phone || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.numberOfResidents || 1} คน
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tenant.status === "active"
                            ? "bg-green-100 text-green-800"
                            : tenant.status === "moving_out"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tenant.status === "active"
                          ? "อยู่ประจำ"
                          : tenant.status === "moving_out"
                          ? "กำลังย้ายออก"
                          : "ย้ายออกแล้ว"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewTenantDetails(tenant)}
                          className="text-blue-600 hover:text-blue-900"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEditTenant(tenant)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="แก้ไข"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(tenant)}
                          className="text-red-600 hover:text-red-900"
                          title="ลบ"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal เพิ่มผู้เช่า */}
      {isAddModalOpen && (
        <AddTenantModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          dormitories={dormitories}
          onSuccess={handleSuccess}
        />
      )}

      {/* Modal แก้ไขผู้เช่า */}
      {isEditModalOpen && selectedTenant && (
        <EditTenantModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTenant(null);
          }}
          tenant={selectedTenant}
          dormitories={dormitories}
          onSuccess={handleSuccess}
        />
      )}

      {/* Modal ยืนยันการลบผู้เช่า */}
      {isDeleteModalOpen && selectedTenant && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedTenant(null);
          }}
          onConfirm={confirmDeleteTenant}
          title="ยืนยันการลบผู้เช่า"
          message={`คุณแน่ใจหรือไม่ที่จะลบผู้เช่า "${selectedTenant.name}" ออกจากระบบ?`}
        />
      )}

      {/* Modal แสดงรายละเอียดผู้เช่า */}
      {isDetailsModalOpen && selectedTenant && (
        <TenantDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedTenant(null);
          }}
          tenantId={selectedTenant.id}
          dormitoryId={selectedDormitory}
        />
      )}
    </div>
  );
} 