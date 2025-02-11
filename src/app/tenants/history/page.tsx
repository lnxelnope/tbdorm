"use client";

import { useState, useEffect } from "react";
import { getTenantHistory, queryDormitories } from "@/lib/firebase/firebaseUtils";
import { TenantHistory, Dormitory } from "@/types/dormitory";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TenantHistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<TenantHistory[]>([]);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadDormitories = async () => {
    try {
      console.log("loadDormitories: start");
      const result = await queryDormitories();
      if (result.success && result.data) {
        console.log("loadDormitories: success", result.data);
        setDormitories(result.data);
      } else {
        console.log("loadDormitories: failed", result.error);
        toast.error('ไม่สามารถโหลดข้อมูลหอพักได้');
      }
    } catch (error) {
      console.error("loadDormitories: error", error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก');
    } finally {
      console.log("loadDormitories: finally");
    }
  };

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      // ถ้าไม่ได้เลือกหอพัก ให้โหลดข้อมูลประวัติผู้เช่าทั้งหมด
      const promises = selectedDormitory 
        ? [getTenantHistory(selectedDormitory)]
        : dormitories.map(dorm => getTenantHistory(dorm.id));
        
      const results = await Promise.all(promises);
      
      // รวมข้อมูลประวัติผู้เช่าจากทุกหอพัก
      const allHistory = results.reduce<TenantHistory[]>((acc, result) => {
        if (result.success && result.data) {
          return [...acc, ...(result.data as TenantHistory[])];
        }
        return acc;
      }, []);
      
      setHistory(allHistory);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      await loadDormitories();
      setIsLoading(false);
    };
    initializeData();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [selectedDormitory]);

  const filteredHistory = history.filter(record => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      record.name.toLowerCase().includes(searchLower) ||
      record.roomNumber.toLowerCase().includes(searchLower) ||
      record.phone.toLowerCase().includes(searchLower)
    );
  });

  const getLeaveReasonText = (reason: 'end_contract' | 'incorrect_data') => {
    switch (reason) {
      case 'incorrect_data':
        return 'ข้อมูลผิดพลาด';
      case 'end_contract':
        return 'สิ้นสุดสัญญา';
      default:
        return 'ไม่ระบุ';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">ประวัติผู้เช่า</h1>
          <p className="mt-1 text-sm text-gray-500">แสดงประวัติผู้เช่าที่ย้ายออกทั้งหมด</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ตารางประวัติผู้เช่า</CardTitle>
              <CardDescription>แสดงข้อมูลผู้เช่าที่ย้ายออกทั้งหมด</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="dormitory" className="block text-sm font-medium text-gray-700 mb-1">
                  หอพัก
                </label>
                <select
                  id="dormitory"
                  value={selectedDormitory}
                  onChange={(e) => setSelectedDormitory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">เลือกหอพัก</option>
                  {dormitories.map((dormitory) => (
                    <option key={dormitory.id} value={dormitory.id}>
                      {dormitory.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  ค้นหา
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="ค้นหาด้วยชื่อ, เบอร์โทร หรือเลขห้อง"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เลขห้อง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อ-นามสกุล
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หอพัก
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เบอร์โทร
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่เข้าพัก
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่ย้ายออก
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เหตุผล
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หมายเหตุ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                        {selectedDormitory ? 'ไม่พบข้อมูลประวัติผู้เช่า' : 'กรุณาเลือกหอพัก'}
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.roomNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {dormitories.find(d => d.id === record.dormitoryId)?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.startDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.leaveDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getLeaveReasonText(record.leaveReason)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.note || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
