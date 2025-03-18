"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getTenantHistory } from "@/lib/firebase/firebaseUtils";
import { Tenant } from "@/types/tenant";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  ArrowUpDown,
  UserX,
  Calendar,
  Home
} from "lucide-react";
import Link from "next/link";

// ฟังก์ชันช่วยจัดรูปแบบวันที่
const formatDate = (dateString: string | Date) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function TenantHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const dormId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [tenantHistory, setTenantHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "leaveDate",
    direction: "desc",
  });

  // ฟังก์ชันโหลดข้อมูลประวัติผู้เช่า
  const loadTenantHistory = async () => {
    try {
      setIsLoading(true);
      const result = await getTenantHistory(dormId);
      if (result.success && result.data) {
        setTenantHistory(result.data);
      } else {
        toast.error("ไม่สามารถโหลดข้อมูลประวัติผู้เช่าได้");
      }
    } catch (error) {
      console.error("Error loading tenant history:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลประวัติผู้เช่า");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenantHistory();
  }, [dormId]);

  // ฟังก์ชันจัดการการเรียงลำดับ
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // ฟังก์ชันกรองและเรียงลำดับข้อมูล
  const filteredAndSortedTenants = tenantHistory
    .filter((tenant) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        tenant.firstName?.toLowerCase().includes(query) ||
        tenant.lastName?.toLowerCase().includes(query) ||
        tenant.roomNumber?.toLowerCase().includes(query) ||
        tenant.phone?.toLowerCase().includes(query) ||
        tenant.email?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (!aValue || !bValue) return 0;

      let comparison = 0;
      if (sortConfig.key === "leaveDate") {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        comparison = aDate - bDate;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === "desc" ? comparison * -1 : comparison;
    });

  // ฟังก์ชันลบข้อมูลประวัติผู้เช่า
  const handleDelete = async () => {
    if (!selectedTenant) return;

    try {
      setIsDeleting(true);
      // ในอนาคตจะเพิ่มฟังก์ชันลบข้อมูลประวัติผู้เช่า
      // const result = await deleteTenantHistory(dormId, selectedTenant.id);
      
      // จำลองการลบข้อมูล
      setTimeout(() => {
        toast.success("ลบข้อมูลประวัติผู้เช่าเรียบร้อยแล้ว");
        setIsDeleteDialogOpen(false);
        loadTenantHistory();
        setIsDeleting(false);
      }, 1000);
    } catch (error) {
      console.error("Error deleting tenant history:", error);
      toast.error("เกิดข้อผิดพลาดในการลบข้อมูลประวัติผู้เช่า");
      setIsDeleting(false);
    }
  };

  // ฟังก์ชันแก้ไขข้อมูลประวัติผู้เช่า
  const handleEdit = async (formData: any) => {
    if (!selectedTenant) return;

    try {
      // ในอนาคตจะเพิ่มฟังก์ชันแก้ไขข้อมูลประวัติผู้เช่า
      // const result = await updateTenantHistory(dormId, selectedTenant.id, formData);
      
      // จำลองการแก้ไขข้อมูล
      setTimeout(() => {
        toast.success("แก้ไขข้อมูลประวัติผู้เช่าเรียบร้อยแล้ว");
        setIsEditDialogOpen(false);
        loadTenantHistory();
      }, 1000);
    } catch (error) {
      console.error("Error updating tenant history:", error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไขข้อมูลประวัติผู้เช่า");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/dormitories/${dormId}`} className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">ประวัติผู้เช่า</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="ค้นหาผู้เช่า..."
              className="pl-8 w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredAndSortedTenants.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <UserX className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">ไม่พบข้อมูลประวัติผู้เช่า</h3>
          <p className="mt-2 text-sm text-gray-500">
            ยังไม่มีข้อมูลประวัติผู้เช่าในระบบ หรือไม่พบข้อมูลที่ตรงกับการค้นหา
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    onClick={() => handleSort("roomNumber")}
                    className="flex items-center font-medium"
                  >
                    ห้อง
                    {sortConfig.key === "roomNumber" && (
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
                    onClick={() => handleSort("leaveDate")}
                    className="flex items-center font-medium"
                  >
                    วันที่ย้ายออก
                    {sortConfig.key === "leaveDate" && (
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
                    onClick={() => handleSort("leaveReason")}
                    className="flex items-center font-medium"
                  >
                    สาเหตุการย้ายออก
                    {sortConfig.key === "leaveReason" && (
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
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    {tenant.firstName} {tenant.lastName}
                  </TableCell>
                  <TableCell>{tenant.roomNumber || "-"}</TableCell>
                  <TableCell>{formatDate(tenant.leaveDate)}</TableCell>
                  <TableCell>
                    {tenant.leaveReason === "end_contract"
                      ? "สิ้นสุดสัญญา"
                      : tenant.leaveReason === "incorrect_data"
                      ? "ข้อมูลไม่ถูกต้อง"
                      : tenant.leaveReason || "-"}
                  </TableCell>
                  <TableCell>{tenant.phone || "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          ลบ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog ยืนยันการลบข้อมูล */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบข้อมูลประวัติผู้เช่า</DialogTitle>
            <DialogDescription>
              คุณต้องการลบข้อมูลประวัติผู้เช่า {selectedTenant?.firstName}{" "}
              {selectedTenant?.lastName} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
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
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  กำลังลบ...
                </>
              ) : (
                "ลบข้อมูล"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog แก้ไขข้อมูล */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลประวัติผู้เช่า</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลประวัติผู้เช่า {selectedTenant?.firstName}{" "}
              {selectedTenant?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="firstName" className="text-right">
                ชื่อ
              </label>
              <Input
                id="firstName"
                defaultValue={selectedTenant?.firstName}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="lastName" className="text-right">
                นามสกุล
              </label>
              <Input
                id="lastName"
                defaultValue={selectedTenant?.lastName}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="phone" className="text-right">
                เบอร์โทรศัพท์
              </label>
              <Input
                id="phone"
                defaultValue={selectedTenant?.phone}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="leaveDate" className="text-right">
                วันที่ย้ายออก
              </label>
              <Input
                id="leaveDate"
                type="date"
                defaultValue={
                  selectedTenant?.leaveDate
                    ? new Date(selectedTenant.leaveDate)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="leaveReason" className="text-right">
                สาเหตุการย้ายออก
              </label>
              <select
                id="leaveReason"
                defaultValue={selectedTenant?.leaveReason}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="end_contract">สิ้นสุดสัญญา</option>
                <option value="incorrect_data">ข้อมูลไม่ถูกต้อง</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="note" className="text-right">
                หมายเหตุ
              </label>
              <textarea
                id="note"
                defaultValue={selectedTenant?.note}
                className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button onClick={() => handleEdit({})}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 