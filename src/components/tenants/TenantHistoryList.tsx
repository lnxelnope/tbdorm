"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp, deleteDoc, doc, updateDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import type { Dormitory } from '@/types/dormitory';
import { Search, ChevronUp, ChevronDown, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@headlessui/react';

interface TenantHistoryListProps {
  dormitories: Dormitory[];
}

interface TenantHistory {
  id: string;
  name: string;
  idCard: string;
  roomNumber: string;
  dormitoryId: string;
  startDate: Date;
  quitDate: Date;
  outstandingBalance: number;
  workplace: string;
  type: 'quit';
}

type SortField = 'name' | 'idCard' | 'dormitory' | 'roomNumber' | 'startDate' | 'quitDate' | 'outstandingBalance' | 'workplace';

export default function TenantHistoryList({ dormitories }: TenantHistoryListProps) {
  const [histories, setHistories] = useState<TenantHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHistories, setSelectedHistories] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTenantForView, setSelectedTenantForView] = useState<TenantHistory | null>(null);
  const [electricityHistory, setElectricityHistory] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any>({
    totalIncome: 0,
    onTimeCount: 0,
    lateCount: 0,
    outstandingCount: 0,
    averagePayment: 0
  });
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    direction: 'asc' | 'desc';
  }>({
    field: 'quitDate',
    direction: 'desc'
  });

  useEffect(() => {
    fetchHistories();
  }, []);

  const fetchHistories = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const historyRef = collection(db, 'tenant_history');
      const q = query(historyRef);
      
      console.log('Fetching tenant history...');
      const snapshot = await getDocs(q);
      console.log('Snapshot size:', snapshot.size);
      
      if (snapshot.empty) {
        console.log('No tenant history found');
        setHistories([]);
        return;
      }

      const historyData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Document data:', data);

        const convertToDate = (dateField: any): Date => {
          try {
            if (!dateField) return new Date();
            if (dateField instanceof Timestamp) return dateField.toDate();
            if (dateField instanceof Date) return dateField;
            if (typeof dateField === 'string') return new Date(dateField);
            return new Date();
          } catch (error) {
            console.error('Date conversion error:', error);
            return new Date();
          }
        };

        return {
          id: doc.id,
          name: data.name || '',
          idCard: data.idCard || '',
          roomNumber: data.roomNumber || '',
          dormitoryId: data.dormitoryId || '',
          startDate: convertToDate(data.startDate),
          quitDate: convertToDate(data.quitDate),
          outstandingBalance: Number(data.outstandingBalance) || 0,
          workplace: data.workplace || '',
          type: data.type || 'quit'
        };
      });

      console.log('Processed history data:', historyData);
      setHistories(historyData);
    } catch (error) {
      console.error('Error fetching histories:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลประวัติผู้เช่า');
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลประวัติผู้เช่า');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedHistories(filteredHistories.map(history => history.id));
    } else {
      setSelectedHistories([]);
    }
  };

  const handleSelectHistory = (historyId: string) => {
    setSelectedHistories(prev => {
      if (prev.includes(historyId)) {
        return prev.filter(id => id !== historyId);
      } else {
        return [...prev, historyId];
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`ต้องการลบประวัติผู้เช่าที่เลือกทั้งหมด ${selectedHistories.length} รายการหรือไม่?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      
      for (const historyId of selectedHistories) {
        await deleteDoc(doc(db, 'tenant_history', historyId));
      }

      toast.success(`ลบประวัติผู้เช่าที่เลือกทั้งหมด ${selectedHistories.length} รายการเรียบร้อยแล้ว`);
      setSelectedHistories([]);
      fetchHistories();
    } catch (error) {
      console.error('Error deleting histories:', error);
      toast.error('เกิดข้อผิดพลาดในการลบประวัติผู้เช่า');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (!window.confirm('ต้องการลบประวัติผู้เช่ารายการนี้หรือไม่?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'tenant_history', historyId));
      toast.success('ลบประวัติผู้เช่าเรียบร้อยแล้ว');
      fetchHistories();
    } catch (error) {
      console.error('Error deleting history:', error);
      toast.error('เกิดข้อผิดพลาดในการลบประวัติผู้เช่า');
    }
  };

  const handleUpdateOutstandingBalance = async (historyId: string, currentBalance: number) => {
    const newBalance = window.prompt('กรุณากรอกยอดค้างชำระใหม่:', currentBalance.toString());
    
    if (newBalance === null) return;
    
    const balance = Number(newBalance);
    if (isNaN(balance)) {
      toast.error('กรุณากรอกตัวเลขที่ถูกต้อง');
      return;
    }

    try {
      await updateDoc(doc(db, 'tenant_history', historyId), {
        outstandingBalance: balance,
        updatedAt: new Date()
      });
      
      toast.success('อัปเดตยอดค้างชำระเรียบร้อยแล้ว');
      fetchHistories();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตยอดค้างชำระ');
    }
  };

  const loadElectricityHistory = async (dormitoryId: string, roomNumber: string) => {
    try {
      const meterRef = collection(db, `dormitories/${dormitoryId}/meter_readings`);
      const q = query(
        meterRef,
        where('roomNumber', '==', roomNumber),
        orderBy('readDate', 'desc'),
        limit(12)
      );
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setElectricityHistory(history);
    } catch (error) {
      console.error('Error loading electricity history:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดประวัติการใช้ไฟฟ้า');
    }
  };

  const loadPaymentHistory = async (dormitoryId: string, roomNumber: string) => {
    try {
      const billsRef = collection(db, `dormitories/${dormitoryId}/bills`);
      const q = query(
        billsRef,
        where('roomNumber', '==', roomNumber),
        orderBy('dueDate', 'desc')
      );
      const snapshot = await getDocs(q);
      
      let totalIncome = 0;
      let onTimeCount = 0;
      let lateCount = 0;
      let outstandingCount = 0;
      let totalAmount = 0;

      snapshot.docs.forEach(doc => {
        const bill = doc.data();
        totalAmount += bill.totalAmount || 0;
        
        if (bill.status === 'paid') {
          totalIncome += bill.totalAmount || 0;
          if (new Date(bill.paidDate) <= new Date(bill.dueDate)) {
            onTimeCount++;
          } else {
            lateCount++;
          }
        } else if (bill.status === 'pending') {
          outstandingCount++;
        }
      });

      setPaymentHistory({
        totalIncome,
        onTimeCount,
        lateCount,
        outstandingCount,
        averagePayment: snapshot.docs.length > 0 ? totalAmount / snapshot.docs.length : 0
      });
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดประวัติการชำระเงิน');
    }
  };

  const handleViewTenant = async (tenant: TenantHistory) => {
    setSelectedTenantForView(tenant);
    await Promise.all([
      loadElectricityHistory(tenant.dormitoryId, tenant.roomNumber),
      loadPaymentHistory(tenant.dormitoryId, tenant.roomNumber)
    ]);
  };

  const filteredHistories = histories.filter(history => {
    const searchLower = searchTerm.toLowerCase();
    return (
      history.name.toLowerCase().includes(searchLower) ||
      history.idCard.includes(searchTerm) ||
      history.roomNumber.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    
    switch (sortConfig.field) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'idCard':
        return direction * a.idCard.localeCompare(b.idCard);
      case 'dormitory':
        const dormA = dormitories.find(d => d.id === a.dormitoryId)?.name || '';
        const dormB = dormitories.find(d => d.id === b.dormitoryId)?.name || '';
        return direction * dormA.localeCompare(dormB);
      case 'roomNumber':
        return direction * a.roomNumber.localeCompare(b.roomNumber);
      case 'startDate':
        return direction * (a.startDate.getTime() - b.startDate.getTime());
      case 'quitDate':
        return direction * (a.quitDate.getTime() - b.quitDate.getTime());
      case 'outstandingBalance':
        return direction * (a.outstandingBalance - b.outstandingBalance);
      case 'workplace':
        return direction * a.workplace.localeCompare(b.workplace);
      default:
        return 0;
    }
  });

  const getDormitoryName = (dormitoryId: string) => {
    return dormitories.find(d => d.id === dormitoryId)?.name || 'ไม่พบข้อมูลหอพัก';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedHistories.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">
              เลือก {selectedHistories.length} รายการ
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="ค้นหาจากชื่อ, เลขบัตรประชาชน, หรือเลขห้อง..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* เพิ่ม Dialog สำหรับแสดงข้อมูลผู้เช่า */}
      {selectedTenantForView && (
        <Dialog
          open={!!selectedTenantForView}
          onClose={() => setSelectedTenantForView(null)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-xl bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <Dialog.Title className="text-lg font-semibold">
                  ข้อมูลผู้เช่า
                </Dialog.Title>
                <button
                  type="button"
                  onClick={() => setSelectedTenantForView(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">ข้อมูลส่วนตัว</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">ชื่อ-นามสกุล:</span>
                        <p className="text-sm font-medium text-gray-900">{selectedTenantForView.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">เลขบัตรประชาชน:</span>
                        <p className="text-sm font-medium text-gray-900">{selectedTenantForView.idCard}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">ที่ทำงาน:</span>
                        <p className="text-sm font-medium text-gray-900">{selectedTenantForView.workplace || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">ข้อมูลการเช่า</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">หอพัก:</span>
                        <p className="text-sm font-medium text-gray-900">
                          {dormitories.find(d => d.id === selectedTenantForView.dormitoryId)?.name || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">เลขห้อง:</span>
                        <p className="text-sm font-medium text-gray-900">{selectedTenantForView.roomNumber}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">วันที่เข้าพัก:</span>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTenantForView.startDate.toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">วันที่ย้ายออก:</span>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTenantForView.quitDate.toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* เพิ่มส่วนแสดงข้อมูลการเงินและการชำระเงิน */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">ข้อมูลการเงิน</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <span className="text-sm text-gray-500">รายได้รวมจากผู้เช่า:</span>
                      <p className="text-lg font-medium text-green-600">
                        {paymentHistory.totalIncome.toLocaleString()} บาท
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <span className="text-sm text-gray-500">ค่าเช่าเฉลี่ยต่อเดือน:</span>
                      <p className="text-lg font-medium text-blue-600">
                        {paymentHistory.averagePayment.toLocaleString()} บาท
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <span className="text-sm text-gray-500">ยอดค้างชำระ:</span>
                      <p className="text-lg font-medium text-red-600">
                        {selectedTenantForView.outstandingBalance.toLocaleString()} บาท
                      </p>
                    </div>
                  </div>
                </div>

                {/* เพิ่มส่วนแสดงประวัติการใช้ไฟฟ้า */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">ประวัติการใช้ไฟฟ้า</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">วันที่จด</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">เลขมิเตอร์</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">หน่วยที่ใช้</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ค่าไฟ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {electricityHistory.map((record, index) => {
                          const prevRecord = electricityHistory[index + 1];
                          const unitsUsed = prevRecord 
                            ? record.meterReading - prevRecord.meterReading
                            : 0;
                          const dormitory = dormitories.find(d => d.id === selectedTenantForView.dormitoryId);
                          const electricityRate = dormitory?.config?.additionalFees?.utilities?.electric?.unit || 0;
                          const cost = unitsUsed * electricityRate;

                          return (
                            <tr key={record.id}>
                              <td className="px-4 py-2 text-sm">
                                {new Date(record.readDate).toLocaleDateString('th-TH')}
                              </td>
                              <td className="px-4 py-2 text-sm">{record.meterReading}</td>
                              <td className="px-4 py-2 text-sm">{unitsUsed}</td>
                              <td className="px-4 py-2 text-sm">{cost.toLocaleString()} บาท</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setSelectedTenantForView(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ปิด
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* แก้ไขส่วนของตารางให้มีการคลิกที่ชื่อได้ */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedHistories.length === filteredHistories.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center gap-1">
                  ชื่อ-นามสกุล
                  <SortIcon field="name" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('idCard')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center gap-1">
                  เลขบัตรประชาชน
                  <SortIcon field="idCard" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('dormitory')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center gap-1">
                  หอพัก
                  <SortIcon field="dormitory" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('roomNumber')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center gap-1">
                  ห้อง
                  <SortIcon field="roomNumber" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('startDate')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center gap-1">
                  วันที่เริ่มเช่า
                  <SortIcon field="startDate" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('quitDate')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center gap-1">
                  วันที่ย้ายออก
                  <SortIcon field="quitDate" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('workplace')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center gap-1">
                  ที่ทำงาน
                  <SortIcon field="workplace" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('outstandingBalance')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
              >
                <div className="flex items-center gap-1">
                  ยอดค้างชำระ
                  <SortIcon field="outstandingBalance" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredHistories.length > 0 ? (
              filteredHistories.map((history) => (
                <tr key={history.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedHistories.includes(history.id)}
                      onChange={() => handleSelectHistory(history.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleViewTenant(history)}
                      className="text-sm text-gray-900 hover:text-blue-600 hover:underline text-left"
                    >
                      {history.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{history.idCard}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getDormitoryName(history.dormitoryId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{history.roomNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {history.startDate.toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {history.quitDate.toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {history.workplace || "-"}
                  </td>
                  <td 
                    className={`px-6 py-4 whitespace-nowrap text-sm ${history.outstandingBalance > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}
                    onClick={() => handleUpdateOutstandingBalance(history.id, history.outstandingBalance)}
                    style={{ cursor: 'pointer' }}
                    title="คลิกเพื่อแก้ไขยอดค้างชำระ"
                  >
                    {history.outstandingBalance.toLocaleString()} บาท
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteHistory(history.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                  {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่พบข้อมูลประวัติผู้เช่า'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 