"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getBillsByDormitory, deleteBill } from "@/lib/firebase/billUtils";
import { Bill } from "@/types/bill";
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
  FileX,
  Calendar,
  Receipt
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

// ฟังก์ชันช่วยจัดรูปแบบเงิน
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// ฟังก์ชันช่วยแปลงสถานะบิล
const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'รอชำระเงิน';
    case 'partially_paid':
      return 'ชำระบางส่วน';
    case 'paid':
      return 'ชำระแล้ว';
    case 'overdue':
      return 'เกินกำหนด';
    default:
      return status;
  }
};

// ฟังก์ชันช่วยกำหนดสีของสถานะบิล
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    case 'partially_paid':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'paid':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

// ฟังก์ชันช่วยแปลงวิธีการชำระเงิน
const getPaymentMethodText = (method: string) => {
  switch (method) {
    case 'cash':
      return 'เงินสด';
    case 'bank_transfer':
      return 'โอนเงิน';
    case 'promptpay':
      return 'พร้อมเพย์';
    default:
      return method || '-';
  }
};

export default function BillHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const dormId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterConfig, setFilterConfig] = useState({
    status: "all",
    month: "all",
    year: "all",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "createdAt",
    direction: "desc",
  });

  // สร้างตัวเลือกสำหรับเดือน
  const monthOptions = [
    { value: "1", label: "มกราคม" },
    { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" },
    { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" },
    { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" },
    { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ];

  // สร้างตัวเลือกสำหรับปี
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i + 543).toString(),
  }));

  // สร้างตัวเลือกสำหรับสถานะ
  const statusOptions = [
    { value: "pending", label: "รอชำระเงิน" },
    { value: "partially_paid", label: "ชำระบางส่วน" },
    { value: "paid", label: "ชำระแล้ว" },
    { value: "overdue", label: "เกินกำหนด" },
  ];

  // ฟังก์ชันโหลดข้อมูลประวัติบิล
  const loadBills = async () => {
    try {
      setIsLoading(true);
      const result = await getBillsByDormitory(dormId);
      if (result.success && result.data) {
        setBills(result.data);
      } else {
        toast.error("ไม่สามารถโหลดข้อมูลประวัติบิลได้");
      }
    } catch (error) {
      console.error("Error loading bills:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลประวัติบิล");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
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
  const filteredAndSortedBills = bills
    .filter((bill) => {
      // กรองตามสถานะ
      if (filterConfig.status !== "all" && bill.status !== filterConfig.status) {
        return false;
      }

      // กรองตามเดือน
      if (
        filterConfig.month !== "all" &&
        bill.month.toString() !== filterConfig.month
      ) {
        return false;
      }

      // กรองตามปี
      if (
        filterConfig.year !== "all" &&
        bill.year.toString() !== filterConfig.year
      ) {
        return false;
      }

      // กรองตามคำค้นหา
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          bill.id.toLowerCase().includes(query) ||
          (bill.tenantName && bill.tenantName.toLowerCase().includes(query)) ||
          (bill.roomNumber && bill.roomNumber.toLowerCase().includes(query))
        );
      }

      return true;
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Bill];
      const bValue = b[sortConfig.key as keyof Bill];

      if (!aValue || !bValue) return 0;

      let comparison = 0;
      if (sortConfig.key === "createdAt" || sortConfig.key === "dueDate") {
        const aDate = new Date(aValue as string).getTime();
        const bDate = new Date(bValue as string).getTime();
        comparison = aDate - bDate;
      } else if (
        sortConfig.key === "totalAmount" ||
        sortConfig.key === "paidAmount" ||
        sortConfig.key === "remainingAmount"
      ) {
        comparison = (aValue as number) - (bValue as number);
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === "desc" ? comparison * -1 : comparison;
    });

  // ฟังก์ชันลบข้อมูลประวัติบิล
  const handleDelete = async () => {
    if (!selectedBill) return;

    try {
      setIsDeleting(true);
      const result = await deleteBill(dormId, selectedBill.id);
      
      if (result.success) {
        toast.success("ลบข้อมูลประวัติบิลเรียบร้อยแล้ว");
        setIsDeleteDialogOpen(false);
        loadBills();
      } else {
        toast.error(`ไม่สามารถลบข้อมูลประวัติบิล: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast.error("เกิดข้อผิดพลาดในการลบข้อมูลประวัติบิล");
    } finally {
      setIsDeleting(false);
    }
  };

  // ฟังก์ชันแก้ไขข้อมูลประวัติบิล
  const handleEdit = async (formData: any) => {
    if (!selectedBill) return;

    try {
      // ในอนาคตจะเพิ่มฟังก์ชันแก้ไขข้อมูลประวัติบิล
      // const result = await updateBill(dormId, selectedBill.id, formData);
      
      // จำลองการแก้ไขข้อมูล
      setTimeout(() => {
        toast.success("แก้ไขข้อมูลประวัติบิลเรียบร้อยแล้ว");
        setIsEditDialogOpen(false);
        loadBills();
      }, 1000);
    } catch (error) {
      console.error("Error updating bill:", error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไขข้อมูลประวัติบิล");
    }
  };

  // สรุปข้อมูลบิล
  const billSummary = useMemo(() => {
    // กรองบิลตามเงื่อนไขที่เลือก
    const filteredBills = bills.filter((bill) => {
      // กรองตามสถานะ
      if (filterConfig.status !== "all" && bill.status !== filterConfig.status) {
        return false;
      }

      // กรองตามเดือน
      if (
        filterConfig.month !== "all" &&
        bill.month.toString() !== filterConfig.month
      ) {
        return false;
      }

      // กรองตามปี
      if (
        filterConfig.year !== "all" &&
        bill.year.toString() !== filterConfig.year
      ) {
        return false;
      }

      // กรองตามคำค้นหา
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          bill.id.toLowerCase().includes(query) ||
          (bill.tenantName && bill.tenantName.toLowerCase().includes(query)) ||
          (bill.roomNumber && bill.roomNumber.toLowerCase().includes(query))
        );
      }

      return true;
    });

    return {
      total: filteredBills.length,
      pending: filteredBills.filter((bill) => bill.status === "pending").length,
      paid: filteredBills.filter((bill) => bill.status === "paid").length,
      partiallyPaid: filteredBills.filter((bill) => bill.status === "partially_paid").length,
      overdue: filteredBills.filter((bill) => bill.status === "overdue").length,
      totalAmount: filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      paidAmount: filteredBills.reduce((sum, bill) => sum + bill.paidAmount, 0),
      remainingAmount: filteredBills.reduce((sum, bill) => sum + bill.remainingAmount, 0),
    };
  }, [bills, filterConfig, searchQuery]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/dormitories/${dormId}`} className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">ประวัติบิล</h1>
        </div>
      </div>

      {/* สรุปข้อมูลบิล */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">บิลทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billSummary.total} บิล</div>
            <p className="text-sm text-gray-500">
              ยอดรวม {formatCurrency(billSummary.totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">รอชำระเงิน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billSummary.pending} บิล</div>
            <p className="text-sm text-gray-500">
              ยอดรวม {formatCurrency(billSummary.remainingAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">ชำระแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billSummary.paid} บิล</div>
            <p className="text-sm text-gray-500">
              ยอดรวม {formatCurrency(billSummary.paidAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">เกินกำหนด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billSummary.overdue} บิล</div>
            <p className="text-sm text-gray-500">
              ยอดค้างชำระ {formatCurrency(billSummary.remainingAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium mb-1">ค้นหา</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <Input
              type="search"
              placeholder="ค้นหาบิล, ห้อง, ผู้เช่า..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">สถานะ</label>
          <Select
            value={filterConfig.status}
            onValueChange={(value) =>
              setFilterConfig({ ...filterConfig, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">เดือน</label>
          <Select
            value={filterConfig.month}
            onValueChange={(value) =>
              setFilterConfig({ ...filterConfig, month: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกเดือน" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">ปี</label>
          <Select
            value={filterConfig.year}
            onValueChange={(value) =>
              setFilterConfig({ ...filterConfig, year: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกปี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {yearOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredAndSortedBills.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileX className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">ไม่พบข้อมูลประวัติบิล</h3>
          <p className="mt-2 text-sm text-gray-500">
            ยังไม่มีข้อมูลประวัติบิลในระบบ หรือไม่พบข้อมูลที่ตรงกับการค้นหา
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
                    onClick={() => handleSort("id")}
                    className="flex items-center font-medium"
                  >
                    รหัสบิล
                    {sortConfig.key === "id" && (
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
                    onClick={() => handleSort("tenantName")}
                    className="flex items-center font-medium"
                  >
                    ผู้เช่า
                    {sortConfig.key === "tenantName" && (
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
                    onClick={() => handleSort("month")}
                    className="flex items-center font-medium"
                  >
                    เดือน/ปี
                    {sortConfig.key === "month" && (
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
                    onClick={() => handleSort("totalAmount")}
                    className="flex items-center font-medium"
                  >
                    ยอดรวม
                    {sortConfig.key === "totalAmount" && (
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
                    onClick={() => handleSort("paidAmount")}
                    className="flex items-center font-medium"
                  >
                    ชำระแล้ว
                    {sortConfig.key === "paidAmount" && (
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
              {filteredAndSortedBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.id.substring(0, 8)}...</TableCell>
                  <TableCell>{bill.roomNumber || bill.roomId}</TableCell>
                  <TableCell>{bill.tenantName || "-"}</TableCell>
                  <TableCell>
                    {monthOptions.find((m) => m.value === bill.month.toString())?.label}{" "}
                    {bill.year + 543}
                  </TableCell>
                  <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                  <TableCell>{formatCurrency(bill.paidAmount)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(bill.status)}>
                      {getStatusText(bill.status)}
                    </Badge>
                  </TableCell>
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
                            router.push(`/dormitories/${dormId}/bills/${bill.id}`);
                          }}
                        >
                          <Receipt className="mr-2 h-4 w-4" />
                          ดูรายละเอียด
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedBill(bill);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedBill(bill);
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
            <DialogTitle>ยืนยันการลบข้อมูลบิล</DialogTitle>
            <DialogDescription>
              คุณต้องการลบข้อมูลบิลของห้อง {selectedBill?.roomNumber || selectedBill?.roomId}{" "}
              ประจำเดือน{" "}
              {selectedBill
                ? `${
                    monthOptions.find(
                      (m) => m.value === selectedBill.month.toString()
                    )?.label
                  } ${selectedBill.year + 543}`
                : ""}{" "}
              ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
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
            <DialogTitle>แก้ไขข้อมูลบิล</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลบิลของห้อง {selectedBill?.roomNumber || selectedBill?.roomId}{" "}
              ประจำเดือน{" "}
              {selectedBill
                ? `${
                    monthOptions.find(
                      (m) => m.value === selectedBill.month.toString()
                    )?.label
                  } ${selectedBill.year + 543}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="status" className="text-right">
                สถานะ
              </label>
              <select
                id="status"
                defaultValue={selectedBill?.status}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="dueDate" className="text-right">
                วันครบกำหนด
              </label>
              <Input
                id="dueDate"
                type="date"
                defaultValue={
                  selectedBill?.dueDate
                    ? new Date(selectedBill.dueDate)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="totalAmount" className="text-right">
                ยอดรวม
              </label>
              <Input
                id="totalAmount"
                type="number"
                defaultValue={selectedBill?.totalAmount}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="paidAmount" className="text-right">
                ชำระแล้ว
              </label>
              <Input
                id="paidAmount"
                type="number"
                defaultValue={selectedBill?.paidAmount}
                className="col-span-3"
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