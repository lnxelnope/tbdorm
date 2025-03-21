"use client";

import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, ArrowUpDown, Calendar, Clock, CheckCircle2, AlertCircle, Ban, Printer, Download } from "lucide-react";
import { Bill, BillItem } from "@/types/bill";
import { Dormitory, DormitoryConfig, Room } from "@/types/dormitory";
import { Tenant } from "@/types/tenant";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// Firebase
import {
  getDormitory,
  getDormitoryConfig,
  getRooms,
  queryTenants,
  updateRoomStatus,
  queryDormitories as getDormitories
} from "@/lib/firebase/firebaseUtils";
import {
  getBillsByDormitory as getBills,
  createBill,
  updateBill,
  deleteBill
} from "@/lib/firebase/billUtils";

// Custom components
import BillDetailsModal from "@/components/bills/BillDetailsModal";
import PaymentModal from "./components/PaymentModal";

export default async function BillsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const dormId = searchParams?.dormId as string;
  const dormitoryId = searchParams?.dormitoryId as string;
  const statusParam = searchParams?.status as string;
  const roomIdParam = searchParams?.roomId as string;

  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState<string>("");
  const [dormitoryConfig, setDormitoryConfig] = useState<DormitoryConfig | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isBillDetailsModalOpen, setIsBillDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Load dormitories on component mount
  useEffect(() => {
    const loadDormitories = async () => {
      if (!user) return;
      
      try {
        const dormitoriesData = await getDormitories();
        console.log("Dormitories data:", dormitoriesData);
        
        if (dormitoriesData.data) {
          setDormitories(dormitoriesData.data);
          
          // If there's only one dormitory, select it automatically
          if (dormitoriesData.data.length === 1) {
            setSelectedDormitory(dormitoriesData.data[0].id);
          }
          
          // If dormitory ID is in URL params, select it
          if (dormitoryId && dormitoriesData.data.some(dorm => dorm.id === dormitoryId)) {
            setSelectedDormitory(dormitoryId);
          }
          
          // ตรวจสอบพารามิเตอร์ status
          if (statusParam) {
            setStatusFilter(statusParam);
          }
        }
      } catch (error) {
        console.error("Error loading dormitories:", error);
        toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
      }
    };
    
    loadDormitories();
  }, [user, dormitoryId, statusParam]);
  
  // Load bills, rooms, and tenants when dormitory is selected
  useEffect(() => {
    if (!selectedDormitory) {
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load dormitory config
        const config = await getDormitoryConfig(selectedDormitory);
        if (config) {
          setDormitoryConfig(config);
        }
        
        // Load rooms
        const roomsData = await getRooms(selectedDormitory);
        if (roomsData.data) {
          setRooms(roomsData.data);
        }
        
        // Load tenants
        const tenantsData = await queryTenants(selectedDormitory);
        if (tenantsData.data) {
          setTenants(tenantsData.data);
        }
        
        // Load bills
        const billsData = await getBills(selectedDormitory);
        
        // Filter bills based on status, month, and year
        const filteredBills = billsData.data ? billsData.data.filter(bill => {
          const statusMatch = statusFilter === "all" || bill.status === statusFilter;
          const monthMatch = bill.month === monthFilter;
          const yearMatch = bill.year === yearFilter;
          
          // ตรวจสอบ roomId จาก URL
          const roomMatch = !roomIdParam || bill.roomId === roomIdParam;
          
          return statusMatch && monthMatch && yearMatch && roomMatch;
        }) : [];
        
        setBills(filteredBills);
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("ไม่สามารถโหลดข้อมูลได้");
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDormitory, statusFilter, monthFilter, yearFilter, roomIdParam]);
  
  // Filter bills based on search term
  const filteredBills = useMemo(() => {
    if (!searchTerm.trim()) return bills;
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return bills.filter(bill => {
      // Find room and tenant info for this bill
      const room = rooms.find(r => r.id === bill.roomId);
      const tenant = tenants.find(t => t.id === bill.tenantId);
      
      return (
        room?.number.toLowerCase().includes(lowerCaseSearchTerm) ||
        tenant?.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        tenant?.phone?.toLowerCase().includes(lowerCaseSearchTerm) ||
        bill.id.toLowerCase().includes(lowerCaseSearchTerm)
      );
    });
  }, [bills, rooms, tenants, searchTerm]);
  
  // Get status color for badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "paid":
        return "bg-green-100 text-green-800 border-green-300";
      case "partially_paid":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-300";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };
  
  // Get status text in Thai
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "รอชำระเงิน";
      case "paid":
        return "ชำระแล้ว";
      case "partially_paid":
        return "ชำระบางส่วน";
      case "overdue":
        return "เกินกำหนด";
      case "cancelled":
        return "ยกเลิก";
      default:
        return status;
    }
  };
  
  // Handle bill selection for viewing details
  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setIsBillDetailsModalOpen(true);
  };
  
  // Handle payment recording
  const handleRecordPayment = (bill: Bill) => {
    setSelectedBill(bill);
    setIsPaymentModalOpen(true);
  };

  // Handle payment submission
  const handlePaymentSubmit = async (paymentData: {
    amount: number;
    method: string;
    date: Date;
    notes?: string;
  }) => {
    if (!selectedBill) return;
    
    try {
      await recordPayment(selectedDormitory, selectedBill.id, {
        amount: paymentData.amount,
        method: paymentData.method,
        date: paymentData.date,
        recordedBy: user?.displayName || user?.email || "Unknown",
        notes: paymentData.notes
      });
      
      // Refresh bills data
      const billsData = await getBills(selectedDormitory);
      
      // Filter bills based on status, month, and year
      if (billsData.success && billsData.data) {
        const filteredBills = billsData.data.filter(bill => {
          const statusMatch = statusFilter === "all" || bill.status === statusFilter;
          const monthMatch = bill.month === monthFilter;
          const yearMatch = bill.year === yearFilter;
          
          // ตรวจสอบ roomId จาก URL
          const roomMatch = !roomIdParam || bill.roomId === roomIdParam;
          
          return statusMatch && monthMatch && yearMatch && roomMatch;
        });
        
        setBills(filteredBills);
      }
      
      toast.success("บันทึกการชำระเงินเรียบร้อยแล้ว");
      setIsPaymentModalOpen(false);
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("ไม่สามารถบันทึกการชำระเงินได้");
    }
  };
  
  // Handle bill deletion
  const handleDeleteBill = async (billId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบิลนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
      return;
    }
    
    try {
      await deleteBill(selectedDormitory, billId);
      
      // Refresh bills data
      const billsData = await getBills(selectedDormitory);
      
      // Filter bills based on status, month, and year
      if (billsData.success && billsData.data) {
        const filteredBills = billsData.data.filter(bill => {
          const statusMatch = statusFilter === "all" || bill.status === statusFilter;
          const monthMatch = bill.month === monthFilter;
          const yearMatch = bill.year === yearFilter;
          
          // ตรวจสอบ roomId จาก URL
          const roomMatch = !roomIdParam || bill.roomId === roomIdParam;
          
          return statusMatch && monthMatch && yearMatch && roomMatch;
        });
        
        setBills(filteredBills);
      }
      
      toast.success("ลบบิลเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast.error("ไม่สามารถลบบิลได้");
    }
  };
  
  // Generate months for dropdown
  const months = [
    { value: 1, label: "มกราคม" },
    { value: 2, label: "กุมภาพันธ์" },
    { value: 3, label: "มีนาคม" },
    { value: 4, label: "เมษายน" },
    { value: 5, label: "พฤษภาคม" },
    { value: 6, label: "มิถุนายน" },
    { value: 7, label: "กรกฎาคม" },
    { value: 8, label: "สิงหาคม" },
    { value: 9, label: "กันยายน" },
    { value: 10, label: "ตุลาคม" },
    { value: 11, label: "พฤศจิกายน" },
    { value: 12, label: "ธันวาคม" }
  ];
  
  // Generate years for dropdown (current year and 5 years back)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  
  // Record payment function
  const recordPayment = async (dormitoryId: string, billId: string, payment: {
    amount: number;
    method: string;
    date: Date;
    recordedBy: string;
    notes?: string;
  }) => {
    try {
      // Get the bill
      const bill = await getBill(dormitoryId, billId);
      
      // Add payment to bill
      const payments = bill.payments || [];
      payments.push(payment);
      
      // Calculate paid amount
      const paidAmount = payments.reduce((total, p) => total + p.amount, 0);
      
      // Update bill status
      let status = bill.status;
      if (paidAmount >= bill.totalAmount) {
        // ถ้าชำระเงินครบแล้ว ให้เปลี่ยนสถานะเป็น "paid" ไม่ว่าสถานะเดิมจะเป็นอะไรก็ตาม
        status = "paid";
      } else if (paidAmount > 0) {
        // ถ้าชำระเงินบางส่วน ให้เปลี่ยนสถานะเป็น "partially_paid"
        // แต่ถ้าเป็น "overdue" อยู่แล้ว ให้คงสถานะเดิมไว้
        if (bill.status !== "overdue") {
          status = "partially_paid";
        }
      }
      
      // คำนวณยอดเงินคงเหลือ
      const remainingAmount = bill.totalAmount - paidAmount;
      
      // Update bill
      await updateBill(dormitoryId, billId, {
        payments,
        paidAmount,
        remainingAmount,
        status
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error recording payment:", error);
      return { success: false, error };
    }
  };
  
  // Get bill function
  const getBill = async (dormitoryId: string, billId: string) => {
    try {
      // Get all bills
      const billsResult = await getBills(dormitoryId);
      
      if (!billsResult.success || !billsResult.data) {
        throw new Error("Failed to get bills");
      }
      
      // Find the bill
      const bill = billsResult.data.find(b => b.id === billId);
      
      if (!bill) {
        throw new Error("Bill not found");
      }
      
      return bill;
        } catch (error) {
      console.error("Error getting bill:", error);
      throw error;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
          <h1 className="text-3xl font-bold tracking-tight">จัดการบิล</h1>
          <p className="text-muted-foreground">
            ดูและจัดการบิลทั้งหมดของหอพัก
          </p>
            </div>
        
        {dormitories.length > 0 && (
          <div className="flex items-center space-x-2">
            <Select
                  value={selectedDormitory}
              onValueChange={(value) => setSelectedDormitory(value)}
                >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="เลือกหอพัก" />
              </SelectTrigger>
              <SelectContent>
                  {dormitories.map((dorm) => (
                  <SelectItem key={dorm.id} value={dorm.id}>
                      {dorm.name}
                  </SelectItem>
                  ))}
              </SelectContent>
            </Select>
              </div>
        )}
              </div>
      
      {selectedDormitory && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">บิลทั้งหมด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-20" /> : bills.length}
                  </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">รอชำระเงิน</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    bills.filter(bill => bill.status === "pending").length
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ชำระแล้ว</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    bills.filter(bill => bill.status === "paid").length
                  )}
              </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">เกินกำหนด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    bills.filter(bill => bill.status === "overdue").length
                  )}
                  </div>
              </CardContent>
            </Card>
            </div>

          <Card>
            <CardHeader>
              <CardTitle>รายการบิล</CardTitle>
              <CardDescription>
                รายการบิลทั้งหมดของหอพัก {dormitories.find(d => d.id === selectedDormitory)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
                <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
                  <div className="flex items-center space-x-2">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="สถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="pending">รอชำระเงิน</SelectItem>
                        <SelectItem value="paid">ชำระแล้ว</SelectItem>
                        <SelectItem value="partially_paid">ชำระบางส่วน</SelectItem>
                        <SelectItem value="overdue">เกินกำหนด</SelectItem>
                        <SelectItem value="cancelled">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={monthFilter.toString()}
                      onValueChange={(value) => setMonthFilter(parseInt(value))}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="เดือน" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={yearFilter.toString()}
                      onValueChange={(value) => setYearFilter(parseInt(value))}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="ปี" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                          </div>
                                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="ค้นหาบิล..."
                      className="pl-8 w-[200px] md:w-[300px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                        </div>

                  <Link href={`/dormitories/${selectedDormitory}/bills/create`}>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      สร้างบิลใหม่
                    </Button>
                  </Link>
                          </div>
                        </div>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">เลขห้อง</TableHead>
                        <TableHead>ผู้เช่า</TableHead>
                        <TableHead>เดือน/ปี</TableHead>
                        <TableHead>วันที่ครบกำหนด</TableHead>
                        <TableHead>จำนวนเงิน</TableHead>
                        <TableHead>ชำระแล้ว</TableHead>
                        <TableHead>คงเหลือ</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                  {filteredBills.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-4">
                            ไม่พบข้อมูลบิล
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBills.map((bill) => {
                          // Find room and tenant info for this bill
                          const room = rooms.find(r => r.id === bill.roomId);
                          const tenant = tenants.find(t => t.id === bill.tenantId);
                          
                          return (
                            <TableRow key={bill.id}>
                              <TableCell className="font-medium">{room?.number || "-"}</TableCell>
                              <TableCell>{tenant?.name || "-"}</TableCell>
                              <TableCell>
                                {months.find(m => m.value === bill.month)?.label} {bill.year}
                              </TableCell>
                              <TableCell>
                                {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('th-TH') : "-"}
                              </TableCell>
                              <TableCell>{bill.totalAmount?.toLocaleString() || 0} บาท</TableCell>
                              <TableCell>{bill.paidAmount?.toLocaleString() || 0} บาท</TableCell>
                              <TableCell>{(bill.totalAmount - bill.paidAmount)?.toLocaleString() || 0} บาท</TableCell>
                              <TableCell>
                                <Badge className={`${getStatusColor(bill.status)}`}>
                                  {getStatusText(bill.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">เปิดเมนู</span>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                      >
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="12" cy="5" r="1" />
                                        <circle cx="12" cy="19" r="1" />
                                      </svg>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>จัดการบิล</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleViewBill(bill)}>
                                      ดูรายละเอียด
                                    </DropdownMenuItem>
                                    {bill.status !== "paid" && (
                                      <DropdownMenuItem onClick={() => handleRecordPayment(bill)}>
                                        บันทึกการชำระเงิน
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem>
                                      <Link href={`/dormitories/${selectedDormitory}/bills/${bill.id}/edit`} className="w-full">
                                        แก้ไขบิล
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Link href={`/dormitories/${selectedDormitory}/bills/${bill.id}/print`} className="w-full">
                                        พิมพ์บิล
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDeleteBill(bill.id)}
                                    >
                                      ลบบิล
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
            </div>
              )}
        </CardContent>
      </Card>
        </>
      )}
      
      {!selectedDormitory && !loading && dormitories.length > 0 && (
        <Card className="mt-4">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">กรุณาเลือกหอพักเพื่อดูรายการบิล</p>
          </CardContent>
        </Card>
      )}
      
      {!loading && dormitories.length === 0 && (
        <Card className="mt-4">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">คุณยังไม่มีหอพัก กรุณาสร้างหอพักก่อน</p>
            <Button asChild>
              <Link href="/dormitories/create">สร้างหอพัก</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Bill Details Modal */}
      {selectedBill && (
        <BillDetailsModal
          isOpen={isBillDetailsModalOpen}
          onClose={() => setIsBillDetailsModalOpen(false)}
          bill={selectedBill}
          room={rooms.find(r => r.id === selectedBill.roomId)}
          tenant={tenants.find(t => t.id === selectedBill.tenantId)}
          onRecordPayment={() => {
            setIsBillDetailsModalOpen(false);
            setIsPaymentModalOpen(true);
          }}
        />
      )}
      
      {/* Payment Modal */}
      {selectedBill && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          bill={selectedBill}
          onSuccess={handlePaymentSubmit}
          dormitoryId={selectedDormitory}
        />
      )}
    </div>
  );
} 