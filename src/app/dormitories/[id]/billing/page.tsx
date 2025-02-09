"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Filter, Search, FileText } from "lucide-react";
import Link from "next/link";
import { Bill, Dormitory } from "@/types/dormitory";
import { getBills, getDormitory } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import BankAccountConfig from "../../bills/components/BankAccountConfig";

export default function BillingPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [dormitory, setDormitory] = useState<Dormitory | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [searchTerm, setSearchTerm] = useState("");

  const loadInitialData = useCallback(async () => {
    try {
      const dormitoryRef = doc(db, 'dormitories', params.id);
      const dormitorySnap = await getDoc(dormitoryRef);
      if (dormitorySnap.exists()) {
        setDormitory(dormitorySnap.data() as Dormitory);
      }
    } catch (error) {
      console.error('Error loading dormitory:', error);
      toast.error('Failed to load dormitory data');
    }
  }, [params.id]);

  const loadBills = useCallback(async () => {
    try {
      setIsLoading(true);
      const billsRef = collection(db, 'dormitories', params.id, 'bills');
      let q = query(billsRef);
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.month) {
        q = query(q, where('month', '==', filters.month));
      }
      if (filters.year) {
        q = query(q, where('year', '==', filters.year));
      }
      
      const querySnapshot = await getDocs(q);
      const bills = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Bill[];
      setBills(bills);
    } catch (error) {
      console.error('Error loading bills:', error);
      toast.error('Failed to load bills');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, filters]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const filteredBills = bills.filter((bill) => {
    if (!searchTerm) return true;
    return (
      bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.roomId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusBadgeColor = (status: Bill["status"]) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "partially_paid":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: Bill["status"]) => {
    switch (status) {
      case "paid":
        return "ชำระแล้ว";
      case "pending":
        return "รอชำระ";
      case "overdue":
        return "เกินกำหนด";
      case "partially_paid":
        return "ชำระบางส่วน";
      default:
        return status;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link
            href={`/dormitories/${params.id}`}
            className="text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">รายการบิล</h1>
            {dormitory && (
              <p className="text-sm text-gray-500">{dormitory.name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dormitories/${params.id}/bills/create`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            สร้างบิลใหม่
          </Link>
          <Link
            href={`/dormitories/${params.id}/bills/batch`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <FileText className="w-4 h-4 mr-2" />
            สร้างบิลประจำเดือน
          </Link>
        </div>
      </div>

      {/* ตัวกรองและค้นหา */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              สถานะ
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">ทั้งหมด</option>
              <option value="pending">รอชำระ</option>
              <option value="partially_paid">ชำระบางส่วน</option>
              <option value="paid">ชำระแล้ว</option>
              <option value="overdue">เกินกำหนด</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              เดือน
            </label>
            <select
              value={filters.month}
              onChange={(e) =>
                setFilters({ ...filters, month: parseInt(e.target.value) })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString("th-TH", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ปี
            </label>
            <select
              value={filters.year}
              onChange={(e) =>
                setFilters({ ...filters, year: parseInt(e.target.value) })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - 2 + i
              ).map((year) => (
                <option key={year} value={year}>
                  {year + 543}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ค้นหา
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาตามเลขห้อง..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-10"
              />
              <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* รายการบิล */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                เลขห้อง
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                เดือน/ปี
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ยอดรวม
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ชำระแล้ว
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                คงเหลือ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                สถานะ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                กำหนดชำระ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center">
                  กำลังโหลด...
                </td>
              </tr>
            ) : filteredBills.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center">
                  ไม่พบรายการบิล
                </td>
              </tr>
            ) : (
              filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/dormitories/${params.id}/bills/${bill.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      ห้อง {bill.roomId}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(bill.year, bill.month - 1).toLocaleString("th-TH", {
                      month: "long",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ฿{bill.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ฿{bill.paidAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ฿{bill.remainingAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        bill.status
                      )}`}
                    >
                      {getStatusText(bill.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(bill.dueDate).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/dormitories/${params.id}/bills/${bill.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      ดูรายละเอียด
                    </Link>
                    <Link
                      href={`/dormitories/${params.id}/bills/${bill.id}/payment`}
                      className="text-green-600 hover:text-green-900"
                    >
                      บันทึกการชำระ
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 