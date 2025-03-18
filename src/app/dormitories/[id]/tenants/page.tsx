"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Filter, 
  ArrowUpDown, 
  Trash2, 
  Edit, 
  Eye, 
  UserPlus,
  Loader2,
  AlertTriangle,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { getDormitory, queryTenants } from "@/lib/firebase/firebaseUtils";
import { Tenant } from "@/types/tenant";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import AddTenantModal from "@/components/tenants/AddTenantModal";
import TenantDetailsModal from "@/app/components/tenants/TenantDetailsModal";

interface SortConfig {
  key: keyof Tenant | "";
  direction: "asc" | "desc";
}

interface FilterConfig {
  status: string;
  search: string;
}

export default function TenantsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const dormId = params.id;
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "createdAt", direction: "desc" });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: "all",
    search: "",
  });
  const [dormitoryName, setDormitoryName] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [isTenantDetailsModalOpen, setIsTenantDetailsModalOpen] = useState(false);
  
  // ดึงข้อมูลผู้เช่าและข้อมูลหอพัก
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // ดึงข้อมูลหอพัก
        const dormResult = await getDormitory(dormId);
        if (dormResult.success && dormResult.data) {
          setDormitoryName(dormResult.data.name);
        }

        // ดึงข้อมูลผู้เช่า
        const tenantsResult = await queryTenants(dormId);
        if (tenantsResult.success && tenantsResult.data) {
          setTenants(tenantsResult.data as Tenant[]);
        } else {
          toast.error("ไม่สามารถโหลดข้อมูลผู้เช่าได้");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dormId]);

  // ฟังก์ชันสำหรับการเรียงข้อมูล
  const handleSort = (key: keyof Tenant) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }));
  };

  // ฟังก์ชันสำหรับการกรองข้อมูล
  const handleFilterChange = (key: keyof FilterConfig, value: string) => {
    setFilterConfig((prev) => ({ ...prev, [key]: value }));
  };

  // ฟังก์ชันสำหรับการลบผู้เช่า
  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบผู้เช่านี้?")) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // ลบผู้เช่าจากฐานข้อมูล (ต้องสร้างฟังก์ชันนี้ใน firebaseUtils)
      // await deleteTenant(dormId, tenantId);
      
      // อัปเดตรายการผู้เช่าในหน้าจอ
      setTenants(prevTenants => prevTenants.filter(tenant => tenant.id !== tenantId));
      
      toast.success("ลบผู้เช่าเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error deleting tenant:", error);
      toast.error("ไม่สามารถลบผู้เช่าได้");
    } finally {
      setIsLoading(false);
    }
  };

  // กรองและเรียงข้อมูลผู้เช่า
  const filteredAndSortedTenants = React.useMemo(() => {
    // กรองข้อมูล
    let result = [...tenants];

    if (filterConfig.status && filterConfig.status !== "all") {
      result = result.filter((tenant) => tenant.status === filterConfig.status);
    }

    if (filterConfig.search) {
      const searchLower = filterConfig.search.toLowerCase();
      result = result.filter(
        (tenant) =>
          tenant.id.toLowerCase().includes(searchLower) ||
          (tenant.firstName && tenant.firstName.toLowerCase().includes(searchLower)) ||
          (tenant.lastName && tenant.lastName.toLowerCase().includes(searchLower)) ||
          (tenant.phone && tenant.phone.toLowerCase().includes(searchLower)) ||
          (tenant.email && tenant.email.toLowerCase().includes(searchLower))
      );
    }

    // เรียงข้อมูล
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof Tenant];
        const bValue = b[sortConfig.key as keyof Tenant];

        if (aValue === undefined || bValue === undefined) return 0;

        let comparison = 0;
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }

        return sortConfig.direction === "desc" ? comparison * -1 : comparison;
      });
    }

    return result;
  }, [tenants, filterConfig, sortConfig]);

  // สร้างตัวเลือกสำหรับสถานะ
  const statusOptions = [
    { value: "active", label: "อยู่ระหว่างเช่า" },
    { value: "inactive", label: "ย้ายออกแล้ว" },
    { value: "pending", label: "รอเข้าอยู่" },
  ];

  // แปลงสถานะเป็นภาษาไทย
  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "อยู่ระหว่างเช่า";
      case "inactive":
        return "ย้ายออกแล้ว";
      case "pending":
        return "รอเข้าอยู่";
      default:
        return status;
    }
  };

  // กำหนดสีของ Badge ตามสถานะ
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  // แสดงวันที่ในรูปแบบไทย
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy", { locale: th });
    } catch (error) {
      return dateString;
    }
  };

  // สรุปข้อมูลผู้เช่า
  const tenantSummary = React.useMemo(() => {
    const summary = {
      total: tenants.length,
      active: tenants.filter((tenant) => tenant.status === "active").length,
      inactive: tenants.filter((tenant) => tenant.status === "inactive").length,
      pending: tenants.filter((tenant) => tenant.status === "pending").length,
    };

    return summary;
  }, [tenants]);

  // ฟังก์ชันสำหรับการเพิ่มผู้เช่าใหม่
  const handleAddTenant = () => {
    setIsAddTenantModalOpen(true);
  };

  // ฟังก์ชันสำหรับการดูรายละเอียดผู้เช่า
  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsTenantDetailsModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center space-x-4">
          <Link
            href={`/dormitories/${dormId}`}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span>ย้อนกลับ</span>
          </Link>
          <h1 className="text-2xl font-bold">หอพัก: {dormitoryName}</h1>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mt-4">
          <nav className="-mb-px flex space-x-8">
            <Link
              href={`/dormitories/${dormId}/rooms`}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              จัดการห้องพัก
            </Link>
            <Link
              href={`/dormitories/${dormId}/tenants`}
              className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              aria-current="page"
            >
              จัดการผู้เช่า
            </Link>
            <Link
              href={`/dormitories/${dormId}/bills`}
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              จัดการบิล
            </Link>
          </nav>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <h2 className="text-xl font-semibold">รายการผู้เช่าทั้งหมด</h2>
        <div className="flex space-x-2">
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddTenant}>
            <UserPlus className="w-4 h-4 mr-2" />
            เพิ่มผู้เช่าใหม่
          </Button>
        </div>
      </div>

      {/* สรุปข้อมูลผู้เช่า */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">ผู้เช่าทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantSummary.total} คน</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">อยู่ระหว่างเช่า</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantSummary.active} คน</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">ย้ายออกแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantSummary.inactive} คน</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">รอเข้าอยู่</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantSummary.pending} คน</div>
          </CardContent>
        </Card>
      </div>

      {/* ตัวกรองและค้นหา */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="ค้นหาผู้เช่า..."
            className="pl-10"
            value={filterConfig.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={filterConfig.status}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="สถานะทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะทั้งหมด</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ตารางแสดงผู้เช่า */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
        </div>
      ) : filteredAndSortedTenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <UserPlus className="w-12 h-12 text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-900">ไม่พบข้อมูลผู้เช่า</h3>
          <p className="text-sm text-gray-500 mt-1">
            ยังไม่มีผู้เช่าในระบบหรือไม่พบข้อมูลตามเงื่อนไขที่ค้นหา
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("firstName")}
                    className="flex items-center font-medium"
                  >
                    ชื่อ-นามสกุล
                    {sortConfig.key === "firstName" && (
                      <ArrowUpDown
                        className={`ml-2 h-4 w-4 ${
                          sortConfig.direction === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("phone")}
                    className="flex items-center font-medium"
                  >
                    เบอร์โทรศัพท์
                    {sortConfig.key === "phone" && (
                      <ArrowUpDown
                        className={`ml-2 h-4 w-4 ${
                          sortConfig.direction === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("roomId")}
                    className="flex items-center font-medium"
                  >
                    ห้อง
                    {sortConfig.key === "roomId" && (
                      <ArrowUpDown
                        className={`ml-2 h-4 w-4 ${
                          sortConfig.direction === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("moveInDate")}
                    className="flex items-center font-medium"
                  >
                    วันที่เข้าอยู่
                    {sortConfig.key === "moveInDate" && (
                      <ArrowUpDown
                        className={`ml-2 h-4 w-4 ${
                          sortConfig.direction === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("status")}
                    className="flex items-center font-medium"
                  >
                    สถานะ
                    {sortConfig.key === "status" && (
                      <ArrowUpDown
                        className={`ml-2 h-4 w-4 ${
                          sortConfig.direction === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    {tenant.firstName} {tenant.lastName}
                  </TableCell>
                  <TableCell>{tenant.phone}</TableCell>
                  <TableCell>{tenant.roomId}</TableCell>
                  <TableCell>
                    {tenant.moveInDate ? formatDate(tenant.moveInDate) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(tenant.status)}>
                      {getStatusText(tenant.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleViewTenant(tenant)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        ดูรายละเอียด
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => router.push(`/dormitories/${dormId}/tenants/${tenant.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        แก้ไข
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        ลบ
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog ยืนยันการลบผู้เช่า */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบผู้เช่า</DialogTitle>
            <DialogDescription>
              คุณต้องการลบผู้เช่านี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 bg-yellow-50 rounded-md">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h4 className="font-medium text-yellow-800">คำเตือน</h4>
              <p className="text-sm text-yellow-700">
                การลบผู้เช่าอาจส่งผลกระทบต่อข้อมูลอื่นๆ ที่เกี่ยวข้อง เช่น ประวัติการชำระเงิน
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteTenant(selectedTenant?.id || "")}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  ลบผู้เช่า
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal เพิ่มผู้เช่าใหม่ */}
      {isAddTenantModalOpen && (
        <AddTenantModal
          isOpen={isAddTenantModalOpen}
          onClose={() => setIsAddTenantModalOpen(false)}
          dormitoryId={dormId}
          onSuccess={() => {
            setIsAddTenantModalOpen(false);
            // โหลดข้อมูลผู้เช่าใหม่
            // fetchTenants();
          }}
        />
      )}

      {/* Modal แสดงรายละเอียดผู้เช่า */}
      {selectedTenant && (
        <TenantDetailsModal
          isOpen={isTenantDetailsModalOpen}
          onClose={() => setIsTenantDetailsModalOpen(false)}
          tenant={selectedTenant}
          dormitoryId={dormId}
        />
      )}
    </div>
  );
} 