"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Dormitory } from "@/types/dormitory";
import { Plus, Search, Filter, FileText } from "lucide-react";

interface BillManagementProps {
  dormitories: Dormitory[];
}

interface Bill {
  id: string;
  dormitoryId: string;
  roomNumber: string;
  tenantName: string;
  totalAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  dueDate: Date;
  createdAt: Date;
  items: {
    type: string;
    amount: number;
    description?: string;
  }[];
  paidAmount?: number;
  paidAt?: Date;
  paymentMethod?: string;
  paymentEvidence?: string;
}

export default function BillManagement({ dormitories }: BillManagementProps) {
  const [selectedDormitory, setSelectedDormitory] = useState<string>("");
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showNewBillDialog, setShowNewBillDialog] = useState(false);

  useEffect(() => {
    loadBills();
  }, [selectedDormitory, filterStatus]);

  const loadBills = async () => {
    try {
      setIsLoading(true);
      const loadedBills: Bill[] = [];

      for (const dormitory of dormitories) {
        if (selectedDormitory && dormitory.id !== selectedDormitory) continue;

        const billsRef = collection(db, `dormitories/${dormitory.id}/bills`);
        const billsQuery = query(
          billsRef,
          filterStatus ? where("status", "==", filterStatus) : where("status", "!=", ""),
          orderBy("createdAt", "desc")
        );
        const billsSnapshot = await getDocs(billsQuery);

        billsSnapshot.forEach(doc => {
          const billData = doc.data();
          loadedBills.push({
            id: doc.id,
            ...billData,
            createdAt: billData.createdAt instanceof Timestamp ? 
              billData.createdAt.toDate() : new Date(billData.createdAt),
            dueDate: billData.dueDate instanceof Timestamp ? 
              billData.dueDate.toDate() : new Date(billData.dueDate),
            paidAt: billData.paidAt instanceof Timestamp ? 
              billData.paidAt.toDate() : billData.paidAt ? new Date(billData.paidAt) : undefined
          } as Bill);
        });
      }

      setBills(loadedBills);
    } catch (error) {
      console.error('Error loading bills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'partially_paid':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'ชำระแล้ว';
      case 'overdue':
        return 'เกินกำหนด';
      case 'partially_paid':
        return 'ชำระบางส่วน';
      default:
        return 'รอชำระ';
    }
  };

  return (
    <div className="space-y-6">
      {/* ส่วนควบคุม */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={selectedDormitory}
          onChange={(e) => setSelectedDormitory(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2"
        >
          <option value="">ทุกหอพัก</option>
          {dormitories.map((dorm) => (
            <option key={dorm.id} value={dorm.id}>
              {dorm.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="ค้นหาบิล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2"
        >
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอชำระ</option>
          <option value="paid">ชำระแล้ว</option>
          <option value="overdue">เกินกำหนด</option>
          <option value="partially_paid">ชำระบางส่วน</option>
        </select>

        <Dialog open={showNewBillDialog} onOpenChange={setShowNewBillDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              สร้างบิลใหม่
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>สร้างบิลใหม่</DialogTitle>
            </DialogHeader>
            {/* TODO: เพิ่มฟอร์มสร้างบิลใหม่ */}
          </DialogContent>
        </Dialog>
      </div>

      {/* ตารางบิล */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">เลขที่บิล</th>
              <th className="px-4 py-2 text-left">ห้อง</th>
              <th className="px-4 py-2 text-left">ผู้เช่า</th>
              <th className="px-4 py-2 text-right">จำนวนเงิน</th>
              <th className="px-4 py-2 text-center">สถานะ</th>
              <th className="px-4 py-2 text-left">วันครบกำหนด</th>
              <th className="px-4 py-2 text-center">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {bills
              .filter(bill => 
                bill.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bill.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((bill) => (
                <tr key={bill.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{bill.id.slice(0, 8)}</td>
                  <td className="px-4 py-2">{bill.roomNumber}</td>
                  <td className="px-4 py-2">{bill.tenantName}</td>
                  <td className="px-4 py-2 text-right">
                    {bill.totalAmount.toLocaleString()} บาท
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {getStatusText(bill.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {bill.dueDate.toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 