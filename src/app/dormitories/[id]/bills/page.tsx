"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  FileText,
  Loader2,
  AlertTriangle,
  Info,
  Printer,
  FileDown,
  CheckSquare,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { 
  getBillsByDormitory, 
  deleteBill,
  deleteBills
} from "@/lib/firebase/billUtils";
import { getDormitory } from "@/lib/firebase/firebaseUtils";
import { Bill } from "@/types/dormitory";
import { Bill as BillType, Payment as PaymentType } from "@/types/bill";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import PaymentModal from "../../bills/components/PaymentModal";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { recordPayment } from "@/lib/firebase/paymentUtils";

interface SortConfig {
  key: keyof Bill | "lastPaymentDate" | "lastPaymentMethod" | "";
  direction: "asc" | "desc";
}

interface FilterConfig {
  status: string;
  month: string;
  year: string;
  search: string;
}

export default function BillsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const dormId = params.id;
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "createdAt", direction: "desc" });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: "all",
    month: "all",
    year: "all",
    search: "",
  });
  const [dormitoryName, setDormitoryName] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // เพิ่มสถานะสำหรับการเลือกบิลหลายรายการ
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [jsPDF, setJsPDF] = useState<any>(null);
  const [html2canvas, setHtml2canvas] = useState<any>(null);

  // ดึงข้อมูลบิลและข้อมูลหอพัก
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // ดึงข้อมูลหอพัก
        const dormResult = await getDormitory(dormId);
        if (dormResult.success && dormResult.data) {
          setDormitoryName(dormResult.data.name);
        }

        // ดึงข้อมูลบิล
        const billsResult = await getBillsByDormitory(dormId);
        if (billsResult.success && billsResult.data) {
          setBills(billsResult.data as Bill[]);
        } else {
          toast.error("ไม่สามารถโหลดข้อมูลบิลได้");
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

  // โหลดไลบรารีเมื่อ component mount
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        const jspdfModule = await import('jspdf');
        const html2canvasModule = await import('html2canvas');
        setJsPDF(() => jspdfModule.default);
        setHtml2canvas(() => html2canvasModule.default);
      } catch (error) {
        console.error('Error loading PDF libraries:', error);
      }
    };
    
    loadLibraries();
  }, []);

  // ฟังก์ชันสำหรับการเรียงข้อมูล
  const handleSort = (key: keyof Bill | "lastPaymentDate" | "lastPaymentMethod") => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
    
    // เรียงลำดับข้อมูล
    const sortedBills = [...bills].sort((a, b) => {
      // กรณีพิเศษสำหรับ lastPaymentDate และ lastPaymentMethod
      if (key === "lastPaymentDate" || key === "lastPaymentMethod") {
        const aPayments = a.payments || [];
        const bPayments = b.payments || [];
        
        const aLastPayment = aPayments.length > 0 ? aPayments[aPayments.length - 1] : null;
        const bLastPayment = bPayments.length > 0 ? bPayments[bPayments.length - 1] : null;
        
        if (key === "lastPaymentDate") {
          const aDate = aLastPayment ? new Date(aLastPayment.createdAt || 0).getTime() : 0;
          const bDate = bLastPayment ? new Date(bLastPayment.createdAt || 0).getTime() : 0;
          
          return direction === "desc" ? bDate - aDate : aDate - bDate;
        } else {
          const aMethod = aLastPayment ? aLastPayment.method : "";
          const bMethod = bLastPayment ? bLastPayment.method : "";
          
          return direction === "desc" 
            ? bMethod.localeCompare(aMethod) 
            : aMethod.localeCompare(bMethod);
        }
      }
      
      // กรณีพิเศษสำหรับ roomNumber
      if (key === "roomNumber") {
        const aValue = a.roomNumber || a.roomId || "";
        const bValue = b.roomNumber || b.roomId || "";
        
        // ถ้าเป็นตัวเลข ให้เรียงลำดับตามตัวเลข
        const aNum = parseInt(aValue);
        const bNum = parseInt(bValue);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return direction === "desc" ? bNum - aNum : aNum - bNum;
        }
        
        // ถ้าไม่ใช่ตัวเลข ให้เรียงลำดับตามตัวอักษร
        return direction === "desc" 
          ? bValue.localeCompare(aValue) 
          : aValue.localeCompare(bValue);
      }
      
      // กรณีทั่วไป
      const aValue = a[key as keyof Bill];
      const bValue = b[key as keyof Bill];

      if (aValue === undefined || bValue === undefined) return 0;

      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return direction === "desc" ? comparison * -1 : comparison;
    });
    
    setBills(sortedBills);
  };

  // ฟังก์ชันสำหรับการกรองข้อมูล
  const handleFilterChange = (key: keyof FilterConfig, value: string) => {
    setFilterConfig((prev) => ({ ...prev, [key]: value }));
  };

  // ฟังก์ชันสำหรับการลบบิล
  const handleDeleteBill = async (billId: string) => {
    try {
      setIsDeleting(true);
      
      // ลบบิลจากฐานข้อมูล
      const result = await deleteBill(dormId, billId);
      
      if (result.success) {
        // ปิด dialog
        setIsDeleteDialogOpen(false);
        
        toast.success("ลบบิลเรียบร้อยแล้ว");
        
        // โหลดข้อมูลบิลใหม่
        loadBills();
      } else {
        toast.error(`ไม่สามารถลบบิลได้: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast.error("ไม่สามารถลบบิลได้");
    } finally {
      setIsDeleting(false);
    }
  };

  // กรองและเรียงข้อมูลบิล
  const filteredAndSortedBills = useMemo(() => {
    // กรองข้อมูล
    let result = [...bills];

    if (filterConfig.status && filterConfig.status !== "all") {
      result = result.filter((bill) => bill.status === filterConfig.status);
    }

    if (filterConfig.month && filterConfig.month !== "all") {
      result = result.filter((bill) => bill.month.toString() === filterConfig.month);
    }

    if (filterConfig.year && filterConfig.year !== "all") {
      result = result.filter((bill) => bill.year.toString() === filterConfig.year);
    }

    if (filterConfig.search) {
      const searchLower = filterConfig.search.toLowerCase();
      result = result.filter(
        (bill) =>
          bill.id.toLowerCase().includes(searchLower) ||
          (bill.tenantId && bill.tenantId.toLowerCase().includes(searchLower)) ||
          (bill.roomNumber && bill.roomNumber.toLowerCase().includes(searchLower)) ||
          (bill.roomId && bill.roomId.toLowerCase().includes(searchLower))
      );
    }

    // เรียงข้อมูล
    if (sortConfig.key) {
      result.sort((a, b) => {
        // กรณีพิเศษสำหรับ lastPaymentDate และ lastPaymentMethod
        if (sortConfig.key === "lastPaymentDate" || sortConfig.key === "lastPaymentMethod") {
          const aPayments = a.payments || [];
          const bPayments = b.payments || [];
          
          const aLastPayment = aPayments.length > 0 ? aPayments[aPayments.length - 1] : null;
          const bLastPayment = bPayments.length > 0 ? bPayments[bPayments.length - 1] : null;
          
          if (sortConfig.key === "lastPaymentDate") {
            const aDate = aLastPayment ? new Date(aLastPayment.createdAt || 0).getTime() : 0;
            const bDate = bLastPayment ? new Date(bLastPayment.createdAt || 0).getTime() : 0;
            
            return sortConfig.direction === "desc" ? bDate - aDate : aDate - bDate;
          } else {
            const aMethod = aLastPayment ? aLastPayment.method : "";
            const bMethod = bLastPayment ? bLastPayment.method : "";
            
            return sortConfig.direction === "desc" 
              ? bMethod.localeCompare(aMethod) 
              : aMethod.localeCompare(bMethod);
          }
        }
        
        // กรณีพิเศษสำหรับ roomNumber
        if (sortConfig.key === "roomNumber") {
          const aValue = a.roomNumber || a.roomId || "";
          const bValue = b.roomNumber || b.roomId || "";
          
          // ถ้าเป็นตัวเลข ให้เรียงลำดับตามตัวเลข
          const aNum = parseInt(aValue);
          const bNum = parseInt(bValue);
          
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortConfig.direction === "desc" ? bNum - aNum : aNum - bNum;
          }
          
          // ถ้าไม่ใช่ตัวเลข ให้เรียงลำดับตามตัวอักษร
          return sortConfig.direction === "desc" 
            ? bValue.localeCompare(aValue) 
            : aValue.localeCompare(bValue);
        }
        
        // กรณีทั่วไป
        const aValue = a[sortConfig.key as keyof Bill];
        const bValue = b[sortConfig.key as keyof Bill];

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
  }, [bills, filterConfig, sortConfig]);

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

  // แปลงสถานะเป็นภาษาไทย
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "รอชำระเงิน";
      case "partially_paid":
        return "ชำระบางส่วน";
      case "paid":
        return "ชำระแล้ว";
      case "overdue":
        return "เกินกำหนด";
      default:
        return status;
    }
  };

  // กำหนดสีของ Badge ตามสถานะ
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "partially_paid":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "paid":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "overdue":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  // แสดงจำนวนเงินในรูปแบบสกุลเงินบาท
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    }).format(amount);
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

  // แสดงวิธีการชำระเงินเป็นภาษาไทย
  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "cash":
        return "เงินสด";
      case "bank_transfer":
        return "โอนเงิน";
      case "promptpay":
        return "พร้อมเพย์";
      case "credit_card":
        return "บัตรเครดิต";
      case "other":
        return "อื่นๆ";
      default:
        return method;
    }
  };

  // แสดงวันที่และเวลาในรูปแบบไทย
  const formatDateTime = (dateString: string | Date) => {
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return format(date, "d MMMM yyyy HH:mm น.", { locale: th });
    } catch (error) {
      return String(dateString);
    }
  };

  // สรุปข้อมูลบิล
  const billSummary = useMemo(() => {
    const summary = {
      total: bills.length,
      pending: bills.filter((bill) => bill.status === "pending").length,
      paid: bills.filter((bill) => bill.status === "paid").length,
      partiallyPaid: bills.filter((bill) => bill.status === "partially_paid").length,
      overdue: bills.filter((bill) => bill.status === "overdue").length,
      totalAmount: bills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      paidAmount: bills.reduce((sum, bill) => sum + bill.paidAmount, 0),
      remainingAmount: bills.reduce((sum, bill) => sum + bill.remainingAmount, 0),
      paymentMethods: {
        cash: {
          amount: 0,
          count: 0
        },
        bank_transfer: {
          amount: 0,
          count: 0
        },
        promptpay: {
          amount: 0,
          count: 0
        },
        other: {
          amount: 0,
          count: 0
        }
      }
    };

    // ใช้ Set เพื่อเก็บ billId ที่มีการชำระเงินด้วยวิธีต่างๆ
    const billsByMethod = {
      cash: new Set<string>(),
      bank_transfer: new Set<string>(),
      promptpay: new Set<string>(),
      other: new Set<string>()
    };

    bills.forEach(bill => {
      if (bill.payments && bill.payments.length > 0) {
        bill.payments.forEach(payment => {
          if (payment.method === 'cash') {
            summary.paymentMethods.cash.amount += payment.amount;
            billsByMethod.cash.add(bill.id);
          } else if (payment.method === 'bank_transfer') {
            summary.paymentMethods.bank_transfer.amount += payment.amount;
            billsByMethod.bank_transfer.add(bill.id);
          } else if (payment.method === 'promptpay') {
            summary.paymentMethods.promptpay.amount += payment.amount;
            billsByMethod.promptpay.add(bill.id);
          } else {
            summary.paymentMethods.other.amount += payment.amount;
            billsByMethod.other.add(bill.id);
          }
        });
      }
    });

    // นับจำนวนบิลสำหรับแต่ละวิธีการชำระเงิน
    summary.paymentMethods.cash.count = billsByMethod.cash.size;
    summary.paymentMethods.bank_transfer.count = billsByMethod.bank_transfer.size;
    summary.paymentMethods.promptpay.count = billsByMethod.promptpay.size;
    summary.paymentMethods.other.count = billsByMethod.other.size;

    return summary;
  }, [bills]);

  // ฟังก์ชันสำหรับการเลือกบิลทั้งหมด
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      setSelectedBills(filteredAndSortedBills.map(bill => bill.id));
    } else {
      setSelectedBills([]);
    }
  };

  // ฟังก์ชันสำหรับการเลือกบิลแต่ละรายการ
  const handleSelectBill = (billId: string) => {
    setSelectedBills(prev => {
      if (prev.includes(billId)) {
        const newSelected = prev.filter(id => id !== billId);
        setSelectAll(newSelected.length === filteredAndSortedBills.length);
        return newSelected;
      } else {
        const newSelected = [...prev, billId];
        setSelectAll(newSelected.length === filteredAndSortedBills.length);
        return newSelected;
      }
    });
  };

  // ฟังก์ชันสำหรับการลบบิลหลายรายการ
  const handleBatchDelete = async () => {
    try {
      setIsBatchDeleting(true);
      const billIds = selectedBills.map(id => id);
      const result = await deleteBills(dormId, billIds);

      if (result.success) {
        toast.success(`ลบบิลสำเร็จ ${selectedBills.length} รายการ`);
        setSelectedBills([]);
        setIsBatchDeleteDialogOpen(false);
        loadBills();
      } else {
        // ตรวจสอบว่าเป็นข้อผิดพลาด CORS หรือไม่
        if (result.error && typeof result.error === 'string' && 
            (result.error.includes('CORS') || 
             result.error.includes('access control') || 
             result.error.includes('cross-origin'))) {
          toast.error("เกิดข้อผิดพลาด CORS ในการลบไฟล์สลิปการชำระเงิน แต่บิลถูกลบออกจากฐานข้อมูลแล้ว");
          console.warn('CORS error detected when deleting payment slips.');
          console.warn('Please check your Firebase Storage CORS configuration.');
          setSelectedBills([]);
          setIsBatchDeleteDialogOpen(false);
          loadBills();
        } else {
          toast.error(`เกิดข้อผิดพลาดในการลบบิล: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error deleting bills:", error);
      toast.error("เกิดข้อผิดพลาดในการลบบิล");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // ฟังก์ชันสำหรับการสร้าง PDF
  const handleGeneratePDF = async () => {
    if (selectedBills.length === 0) {
      toast.error("กรุณาเลือกบิลที่ต้องการสร้าง PDF");
      return;
    }

    if (!jsPDF || !html2canvas) {
      toast.error("กำลังโหลดไลบรารี โปรดลองอีกครั้งในอีกสักครู่");
      return;
    }

    try {
      toast.info("กำลังสร้างไฟล์ PDF โปรดรอสักครู่...");
      
      // สร้าง PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const selectedBillsData = filteredAndSortedBills.filter(bill => selectedBills.includes(bill.id));
      
      // สร้างหน้าต่างชั่วคราวสำหรับสร้าง HTML ที่จะแปลงเป็น PDF
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);
      
      for (let i = 0; i < selectedBillsData.length; i++) {
        const bill = selectedBillsData[i];
        
        // สร้าง HTML สำหรับบิลแต่ละรายการ
        tempDiv.innerHTML = `
          <div id="bill-pdf-${i}" style="width: 210mm; padding: 10mm; font-family: 'Sarabun', sans-serif;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <div style="font-size: 24px; font-weight: bold;">ใบแจ้งค่าเช่า</div>
                <div>หอพัก: ${dormitoryName}</div>
              </div>
              <div style="text-align: right;">
                <div>เลขที่: ${bill.id}</div>
                <div>วันที่: ${new Date(bill.createdAt).toLocaleDateString('th-TH')}</div>
                <div>กำหนดชำระ: ${new Date(bill.dueDate).toLocaleDateString('th-TH')}</div>
              </div>
            </div>
            
            <div style="margin-bottom: 20px;">
              <div>ห้อง: ${bill.roomNumber || bill.roomId}</div>
              <div>ประจำเดือน: ${monthOptions.find(m => m.value === bill.month.toString())?.label} ${bill.year + 543}</div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">รายการ</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">จำนวน</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">หน่วยละ</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                ${bill.items.map(item => `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.description}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity || '-'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.unitPrice ? `฿${item.unitPrice.toLocaleString()}` : '-'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">฿${item.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">รวมทั้งสิ้น</td>
                  <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">฿${bill.totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="text-align: right; margin-top: 20px; font-weight: bold;">
              <div>สถานะ: ${getStatusText(bill.status)}</div>
              <div>ชำระแล้ว: ฿${bill.paidAmount.toLocaleString()}</div>
              <div>คงเหลือ: ฿${bill.remainingAmount.toLocaleString()}</div>
            </div>
          </div>
        `;
        
        // แปลง HTML เป็นรูปภาพด้วย html2canvas
        const element = document.getElementById(`bill-pdf-${i}`);
        if (element) {
          const canvas = await html2canvas(element);
          const imgData = canvas.toDataURL('image/png');
          
          // เพิ่มรูปภาพลงใน PDF
          if (i > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(imgData, 'PNG', 0, 0, 210, 297 * canvas.height / canvas.width);
        }
      }
      
      // ลบ div ชั่วคราว
      document.body.removeChild(tempDiv);
      
      // บันทึก PDF
      pdf.save(`บิล_${dormitoryName}_${new Date().toLocaleDateString('th-TH')}.pdf`);
      
      toast.success("สร้างไฟล์ PDF เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF");
    }
  };

  // ฟังก์ชันสำหรับการพิมพ์บิลหลายรายการ
  const handleBatchPrint = () => {
    if (selectedBills.length === 0) {
      toast.error("กรุณาเลือกบิลที่ต้องการพิมพ์");
      return;
    }

    // เปิดหน้าต่างใหม่สำหรับพิมพ์
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("ไม่สามารถเปิดหน้าต่างใหม่ได้ โปรดตรวจสอบการตั้งค่าเบราว์เซอร์");
      return;
    }

    // สร้าง HTML สำหรับพิมพ์
    const selectedBillsData = filteredAndSortedBills.filter(bill => selectedBills.includes(bill.id));
    
    let printContent = `
      <html>
      <head>
        <title>พิมพ์บิล</title>
        <style>
          body { font-family: 'Sarabun', sans-serif; }
          .bill-container { page-break-after: always; padding: 20px; }
          .bill-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .bill-title { font-size: 24px; font-weight: bold; }
          .bill-info { margin-bottom: 20px; }
          .bill-table { width: 100%; border-collapse: collapse; }
          .bill-table th, .bill-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .bill-table th { background-color: #f2f2f2; }
          .bill-total { text-align: right; margin-top: 20px; font-weight: bold; }
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="padding: 20px; text-align: center;">
          <button onclick="window.print()">พิมพ์บิลทั้งหมด</button>
          <button onclick="window.close()">ปิด</button>
        </div>
    `;

    selectedBillsData.forEach(bill => {
      printContent += `
        <div class="bill-container">
          <div class="bill-header">
            <div>
              <div class="bill-title">ใบแจ้งค่าเช่า</div>
              <div>หอพัก: ${dormitoryName}</div>
            </div>
            <div>
              <div>เลขที่: ${bill.id}</div>
              <div>วันที่: ${new Date(bill.createdAt).toLocaleDateString('th-TH')}</div>
              <div>กำหนดชำระ: ${new Date(bill.dueDate).toLocaleDateString('th-TH')}</div>
            </div>
          </div>
          
          <div class="bill-info">
            <div>ห้อง: ${bill.roomNumber || bill.roomId}</div>
            <div>ประจำเดือน: ${monthOptions.find(m => m.value === bill.month.toString())?.label} ${bill.year + 543}</div>
          </div>
          
          <table class="bill-table">
            <thead>
              <tr>
                <th>รายการ</th>
                <th>จำนวน</th>
                <th>หน่วยละ</th>
                <th>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
      `;

      bill.items.forEach(item => {
        printContent += `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity || '-'}</td>
            <td>${item.unitPrice ? `฿${item.unitPrice.toLocaleString()}` : '-'}</td>
            <td>฿${item.amount.toLocaleString()}</td>
          </tr>
        `;
      });

      printContent += `
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align: right;"><strong>รวมทั้งสิ้น</strong></td>
                <td><strong>฿${bill.totalAmount.toLocaleString()}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div class="bill-total">
            <div>สถานะ: ${getStatusText(bill.status)}</div>
            <div>ชำระแล้ว: ฿${bill.paidAmount.toLocaleString()}</div>
            <div>คงเหลือ: ฿${bill.remainingAmount.toLocaleString()}</div>
          </div>
        </div>
      `;
    });

    printContent += `
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handlePayment = (bill: Bill) => {
    setSelectedBill(bill);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (paymentData: {
    amount: number;
    method: string;
    date: Date;
    notes?: string;
    slipUrl?: string;
  }) => {
    if (!selectedBill) {
      toast.error("ไม่พบข้อมูลบิล");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const result = await recordPayment(dormId, selectedBill.id, {
        ...paymentData,
        tenantId: selectedBill.tenantId,
        recordedBy: "Admin" // ใช้ค่าคงที่แทน user?.displayName
      });
      
      if (result.success) {
        toast.success("บันทึกการชำระเงินเรียบร้อยแล้ว");
        setIsPaymentModalOpen(false);
        
        // รีเฟรชข้อมูลบิลทั้งหมดเพื่อให้แน่ใจว่าข้อมูลเป็นปัจจุบัน
        loadBills();
      } else {
        toast.error(result.message || "ไม่สามารถบันทึกการชำระเงินได้");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("ไม่สามารถบันทึกการชำระเงินได้");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBills = async () => {
    try {
      setIsLoading(true);
      const result = await getBillsByDormitory(dormId);
      
      if (result.success) {
        if (result.data && result.data.length > 0) {
          setBills(result.data);
          console.log("Bills loaded:", result.data.length);
        } else {
          setBills([]);
          console.log("No bills found");
          toast.info("ไม่พบข้อมูลบิล");
        }
      } else {
        console.error("Failed to load bills:", result.error);
        toast.error("ไม่สามารถโหลดข้อมูลบิลได้");
      }
    } catch (error) {
      console.error("Error loading bills:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลบิล");
    } finally {
      setIsLoading(false);
    }
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
              className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              จัดการผู้เช่า
            </Link>
            <Link
              href={`/dormitories/${dormId}/bills`}
              className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              aria-current="page"
            >
              จัดการบิล
            </Link>
          </nav>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <h2 className="text-xl font-semibold">รายการบิลทั้งหมด</h2>
      </div>

      {/* สรุปข้อมูลบิล */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <button 
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center"
              onClick={() => {
                setSelectedBill(null);
                setIsPaymentDetailsOpen(true);
              }}
            >
              ดูรายละเอียดการชำระเงิน <Info className="h-3 w-3 ml-1" />
            </button>
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

      {/* ตัวกรองและค้นหา */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="ค้นหาบิล..."
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

          <Select
            value={filterConfig.month}
            onValueChange={(value) => handleFilterChange("month", value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="เดือนทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">เดือนทั้งหมด</SelectItem>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterConfig.year}
            onValueChange={(value) => handleFilterChange("year", value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="ปีทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ปีทั้งหมด</SelectItem>
              {yearOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* แสดงปุ่มสำหรับการทำงานแบบกลุ่มเมื่อมีการเลือกบิล */}
      {selectedBills.length > 0 && (
        <div className="bg-blue-50 p-3 rounded-md flex justify-between items-center">
          <div className="text-blue-700 font-medium">
            เลือกแล้ว {selectedBills.length} รายการ
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-100"
              onClick={handleBatchPrint}
            >
              <Printer className="w-4 h-4 mr-1" />
              พิมพ์
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-100"
              onClick={handleGeneratePDF}
            >
              <FileDown className="w-4 h-4 mr-1" />
              สร้าง PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-100"
              onClick={() => setIsBatchDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              ลบ
            </Button>
          </div>
        </div>
      )}

      {/* ตารางแสดงบิล */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
        </div>
      ) : filteredAndSortedBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-900">ไม่พบข้อมูลบิล</h3>
          <p className="text-sm text-gray-500 mt-1">
            ยังไม่มีบิลในระบบหรือไม่พบข้อมูลตามเงื่อนไขที่ค้นหา
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="เลือกทั้งหมด"
                  />
                </TableHead>
                <TableHead className="w-[100px]">
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
                    onClick={() => handleSort("dueDate")}
                    className="flex items-center font-medium"
                  >
                    วันครบกำหนด
                    {sortConfig.key === "dueDate" && (
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
                    onClick={() => handleSort("remainingAmount")}
                    className="flex items-center font-medium"
                  >
                    คงเหลือ
                    {sortConfig.key === "remainingAmount" && (
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
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("lastPaymentDate")}
                    className="flex items-center font-medium"
                  >
                    วันที่ชำระเงิน
                    {sortConfig.key === "lastPaymentDate" && (
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
                    onClick={() => handleSort("lastPaymentMethod")}
                    className="flex items-center font-medium"
                  >
                    ช่องทางการชำระ
                    {sortConfig.key === "lastPaymentMethod" && (
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
                  <TableCell>
                    <Checkbox
                      checked={selectedBills.includes(bill.id)}
                      onCheckedChange={() => handleSelectBill(bill.id)}
                      aria-label={`เลือกบิล ${bill.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{bill.id.substring(0, 8)}...</TableCell>
                  <TableCell>{bill.roomNumber || bill.roomId}</TableCell>
                  <TableCell>
                    {monthOptions.find((m) => m.value === bill.month.toString())?.label}{" "}
                    {bill.year + 543}
                  </TableCell>
                  <TableCell>{formatDate(bill.dueDate)}</TableCell>
                  <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                  <TableCell>
                    <button 
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                      onClick={() => {
                        setSelectedBill(bill);
                        setIsPaymentDetailsOpen(true);
                      }}
                    >
                      {formatCurrency(bill.paidAmount)}
                      {bill.paidAmount > 0 && (
                        <Info className="h-4 w-4 ml-1 text-blue-500" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>{formatCurrency(bill.remainingAmount)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(bill.status)}>
                      {getStatusText(bill.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {bill.payments && bill.payments.length > 0 ? (
                      formatDateTime(bill.payments[bill.payments.length - 1].paidAt || bill.payments[bill.payments.length - 1].createdAt || new Date())
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {bill.payments && bill.payments.length > 0 ? (
                      getPaymentMethodText(bill.payments[bill.payments.length - 1].method)
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {(bill.status === 'pending' || bill.status === 'partially_paid' || bill.status === 'overdue') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => handlePayment(bill)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          ชำระเงิน
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => router.push(`/dormitories/${dormId}/bills/${bill.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        ดูรายละเอียด
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          setSelectedBill(bill);
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

      {/* Dialog ยืนยันการลบบิล */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบบิล</DialogTitle>
            <DialogDescription>
              คุณต้องการลบบิลนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 bg-yellow-50 rounded-md">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h4 className="font-medium text-yellow-800">คำเตือน</h4>
              <p className="text-sm text-yellow-700">
                การลบบิลจะลบข้อมูลการชำระเงินทั้งหมดที่เกี่ยวข้องด้วย
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
              onClick={() => handleDeleteBill(selectedBill?.id || "")}
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
                  ลบบิล
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ยืนยันการลบบิลหลายรายการ */}
      <Dialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบบิล {selectedBills.length} รายการ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบบิลที่เลือกทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 bg-yellow-50 rounded-md">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h4 className="font-medium text-yellow-800">คำเตือน</h4>
              <p className="text-sm text-yellow-700">
                การลบบิลจะลบข้อมูลการชำระเงินทั้งหมดที่เกี่ยวข้องด้วย
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBatchDeleteDialogOpen(false)}
              disabled={isBatchDeleting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
            >
              {isBatchDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  ลบบิล
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog แสดงรายละเอียดการชำระเงิน */}
      <Dialog open={isPaymentDetailsOpen} onOpenChange={setIsPaymentDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>รายละเอียดการชำระเงิน</DialogTitle>
            <DialogDescription>
              {selectedBill 
                ? `ข้อมูลการชำระเงินของบิลห้อง ${selectedBill.roomNumber || selectedBill.roomId}` 
                : "สรุปยอดการชำระเงินทั้งหมด"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBill ? (
            selectedBill.payments && selectedBill.payments.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-500">
                    ยอดชำระทั้งหมด:
                  </div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(selectedBill.paidAmount)}
                  </div>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่ชำระ</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วิธีการชำระ</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedBill.payments.map((payment, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {typeof payment.paidAt === 'string' 
                              ? formatDateTime(payment.paidAt)
                              : formatDateTime(new Date(payment.paidAt))}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {getPaymentMethodText(payment.method)}
                            {payment.reference && (
                              <div className="text-xs text-gray-500 mt-1">
                                อ้างอิง: {payment.reference}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          รวมทั้งสิ้น
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700 text-right">
                          {formatCurrency(selectedBill.paidAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-500">
                    ยอดคงเหลือ:
                  </div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatCurrency(selectedBill.remainingAmount)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>ยังไม่มีประวัติการชำระเงิน</p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-500">
                  ยอดชำระทั้งหมด:
                </div>
                <div className="text-lg font-semibold text-blue-600">
                  {formatCurrency(billSummary.paidAmount)}
                </div>
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วิธีการชำระเงิน</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนบิล</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billSummary.paymentMethods.cash.amount > 0 && (
                      <tr className="bg-white">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          เงินสด
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {billSummary.paymentMethods.cash.count} บิล
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(billSummary.paymentMethods.cash.amount)}
                        </td>
                      </tr>
                    )}
                    {billSummary.paymentMethods.bank_transfer.amount > 0 && (
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          โอนเงิน
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {billSummary.paymentMethods.bank_transfer.count} บิล
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(billSummary.paymentMethods.bank_transfer.amount)}
                        </td>
                      </tr>
                    )}
                    {billSummary.paymentMethods.promptpay.amount > 0 && (
                      <tr className="bg-white">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          พร้อมเพย์
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {billSummary.paymentMethods.promptpay.count} บิล
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(billSummary.paymentMethods.promptpay.amount)}
                        </td>
                      </tr>
                    )}
                    {billSummary.paymentMethods.other.amount > 0 && (
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          อื่นๆ
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {billSummary.paymentMethods.other.count} บิล
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(billSummary.paymentMethods.other.amount)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-blue-50">
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        รวมทั้งสิ้น
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {billSummary.paid + billSummary.partiallyPaid} บิล
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-700 text-right">
                        {formatCurrency(billSummary.paidAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDetailsOpen(false)}
            >
              ปิด
            </Button>
            {selectedBill && selectedBill.status !== "paid" && (
              <Button
                onClick={() => {
                  setIsPaymentDetailsOpen(false);
                  router.push(`/dormitories/${dormId}/bills/${selectedBill.id}/payment`);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                บันทึกการชำระเงิน
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          bill={{
            id: selectedBill?.id,
            dormitoryId: params.id,
            roomId: selectedBill?.roomId,
            roomNumber: selectedBill?.roomNumber,
            tenantId: selectedBill?.tenantId,
            tenantName: selectedBill?.tenantName,
            month: selectedBill?.month,
            year: selectedBill?.year,
            dueDate: selectedBill?.dueDate,
            createdAt: selectedBill?.createdAt,
            status: selectedBill?.status,
            totalAmount: selectedBill?.totalAmount,
            paidAmount: selectedBill?.paidAmount,
            items: selectedBill?.items,
            payments: []
          }}
          onSuccess={handlePaymentSubmit}
          dormitoryId={params.id}
        />
      )}
    </div>
  );
} 