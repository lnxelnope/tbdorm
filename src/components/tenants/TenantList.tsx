"use client";

import { useState, useEffect } from "react";
import { Dormitory, Tenant } from "@/types/dormitory";
import EditTenantModal from "./EditTenantModal";
import DeleteTenantModal from "./DeleteTenantModal";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Loader2, Plus, X, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { deleteTenant, deleteMultipleTenants, queryTenants, moveTenantToHistory } from "@/lib/firebase/firebaseUtils";
import Link from "next/link";
import { calculateTotalPrice } from "@/app/dormitories/[id]/rooms/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDoc, collection, query, where, getDocs, updateDoc, doc, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Dialog } from "@headlessui/react";
import Modal from "@/components/ui/modal";

interface TenantListProps {
  dormitories: Dormitory[];
  tenants: Tenant[];
  selectedDormitory: string;
  searchQuery: string;
  statusFilter: string;
  onAddClick: () => void;
  onEdit: (tenant: Tenant) => void;
  onRefresh: () => void;
}

type SortField = 'name' | 'onTime' | 'late' | 'outstanding' | 'dormitory' | 'roomNumber' | 'startDate' | 'deposit' | 'numberOfResidents' | 'rent' | 'outstandingBalance';

interface TenantPaymentHistory {
  onTimeCount: number;
  lateCount: number;
  outstandingCount: number;
}

interface FormData {
  name: string;
  idCard: string;
  phone: string;
  email: string;
  lineId: string;
  workplace: string;
  currentAddress: string;
  dormitoryId: string;
  roomId: string;
  roomNumber: string;
  startDate: string;
  deposit: number;
  numberOfResidents: number;
  additionalServices: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export default function TenantList({
  dormitories,
  tenants: initialTenants,
  selectedDormitory,
  searchQuery,
  statusFilter,
  onAddClick,
  onEdit,
  onRefresh,
}: TenantListProps) {
  const [tenants, setTenants] = useState(initialTenants);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    direction: 'asc' | 'desc';
  }>({
    field: 'name',
    direction: 'asc'
  });
  const [selectedTenantForView, setSelectedTenantForView] = useState<Tenant | null>(null);
  const [electricityHistory, setElectricityHistory] = useState<any[]>([]);
  const [paymentHistories, setPaymentHistories] = useState<Record<string, TenantPaymentHistory>>({});
  const [formData, setFormData] = useState<FormData>({
    name: "",
    idCard: "",
    phone: "",
    email: "",
    lineId: "",
    workplace: "",
    currentAddress: "",
    dormitoryId: "",
    roomId: "",
    roomNumber: "",
    startDate: new Date().toISOString().split('T')[0],
    deposit: 0,
    numberOfResidents: 1,
    additionalServices: [],
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTenants(filteredTenants.map(tenant => tenant.id));
    } else {
      setSelectedTenants([]);
    }
  };

  const handleSelectTenant = (tenantId: string) => {
    setSelectedTenants(prev => {
      if (prev.includes(tenantId)) {
        return prev.filter(id => id !== tenantId);
      } else {
        return [...prev, tenantId];
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedTenants.length === 0) return;

    // สร้าง dialog ถามเหตุผลการลบ
    const reason = await new Promise<'quit' | 'error' | null>((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'p-4 rounded-lg shadow-lg bg-white';
      
      const content = document.createElement('div');
      content.className = 'space-y-4';
      content.innerHTML = `
        <h3 class="text-lg font-medium">กรุณาระบุเหตุผลในการลบผู้เช่าที่เลือก (${selectedTenants.length} คน)</h3>
        <div class="space-y-2">
          <button class="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-lg" data-reason="quit">
            เลิกเช่า
          </button>
          <button class="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 rounded-lg" data-reason="error">
            ป้อนข้อมูลผิดพลาด
          </button>
          <button class="w-full px-4 py-2 text-sm text-left text-gray-500 hover:bg-gray-100 rounded-lg" data-reason="cancel">
            ยกเลิก
          </button>
        </div>
      `;

      content.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const reason = target.getAttribute('data-reason');
        if (reason === 'quit') resolve('quit');
        else if (reason === 'error') resolve('error');
        else if (reason === 'cancel') resolve(null);
        dialog.close();
      });

      dialog.appendChild(content);
      document.body.appendChild(dialog);
      dialog.showModal();

      dialog.addEventListener('close', () => {
        document.body.removeChild(dialog);
        resolve(null);
      });
    });

    if (!reason) return;

    try {
      setIsDeleting(true);
      // ต้องมี dormitoryId เดียวกันทั้งหมดจึงจะลบได้
      const firstTenant = tenants.find(t => t.id === selectedTenants[0]);
      if (!firstTenant) return;

      if (reason === 'quit') {
        // บันทึกประวัติผู้เช่าทั้งหมดที่เลือกก่อนลบ
        const selectedTenantData = tenants.filter(t => selectedTenants.includes(t.id));
        
        for (const tenant of selectedTenantData) {
          const tenantHistory = {
            ...tenant,
            quitDate: new Date(),
            type: 'quit' as const,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // เพิ่มประวัติผู้เช่าลงในคอลเลกชัน tenant_history
          await addDoc(collection(db, 'tenant_history'), tenantHistory);
        }
        
        toast.success(`บันทึกประวัติผู้เช่าที่เลือกทั้งหมด ${selectedTenants.length} คนเรียบร้อยแล้ว`);
      }

      const result = await deleteMultipleTenants(firstTenant.dormitoryId, selectedTenants);
      
      if (result.success) {
        toast.success(`ลบผู้เช่าที่เลือกทั้งหมด ${selectedTenants.length} คนเรียบร้อยแล้ว`);
        setSelectedTenants([]);
        // รีเฟรชข้อมูลผู้เช่า
        const result = await queryTenants(selectedDormitory);
        if (result.success && result.data) {
          setTenants(result.data);
        }
      } else {
        toast.error("เกิดข้อผิดพลาดในการลบผู้เช่า");
      }
    } catch (error) {
      console.error("Error deleting tenants:", error);
      toast.error("เกิดข้อผิดพลาดในการลบผู้เช่า");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeleteTenant = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setSelectedTenant(tenant);
      setIsDeleteModalOpen(true);
    }
  };

  const calculateRent = (tenant: Tenant, dormitory: Dormitory | undefined) => {
    if (!dormitory?.config?.roomTypes) return 0;

    const room = {
      id: `${tenant.dormitoryId}_${tenant.roomNumber}`,
      dormitoryId: tenant.dormitoryId,
      number: tenant.roomNumber,
      floor: parseInt(tenant.roomNumber.substring(0, 1)),
      status: 'occupied' as const,
      roomType: Object.values(dormitory.config.roomTypes).find(type => type.isDefault)?.id || '',
      initialMeterReading: 0,
      hasAirConditioner: false,
      hasParking: false,
    };

    const roomType = Object.values(dormitory.config.roomTypes).find(type => type.isDefault);
    if (!roomType) return 0;

    const config = {
      additionalFees: dormitory.config.additionalFees || {
        utilities: {
          water: { perPerson: null },
          electric: { unit: null }
        },
        items: [],
        floorRates: {}
      }
    };

    return calculateTotalPrice(room, [roomType], config);
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesDormitory =
      selectedDormitory === "" || tenant.dormitoryId === selectedDormitory;
    const matchesSearch =
      searchQuery === "" ||
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone.includes(searchQuery) ||
      tenant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.roomNumber.includes(searchQuery);

    return matchesDormitory && matchesSearch;
  }).sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    const paymentHistoryA = paymentHistories[a.id] || { onTimeCount: 0, lateCount: 0, outstandingCount: 0 };
    const paymentHistoryB = paymentHistories[b.id] || { onTimeCount: 0, lateCount: 0, outstandingCount: 0 };
    
    switch (sortConfig.field) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'onTime':
        return direction * (paymentHistoryA.onTimeCount - paymentHistoryB.onTimeCount);
      case 'late':
        return direction * (paymentHistoryA.lateCount - paymentHistoryB.lateCount);
      case 'outstanding':
        return direction * (paymentHistoryA.outstandingCount - paymentHistoryB.outstandingCount);
      case 'dormitory':
        const dormA = dormitories.find(d => d.id === a.dormitoryId)?.name || '';
        const dormB = dormitories.find(d => d.id === b.dormitoryId)?.name || '';
        return direction * dormA.localeCompare(dormB);
      case 'roomNumber':
        return direction * a.roomNumber.localeCompare(b.roomNumber);
      case 'startDate':
        return direction * (new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      case 'deposit':
        return direction * (a.deposit - b.deposit);
      case 'numberOfResidents':
        return direction * (a.numberOfResidents - b.numberOfResidents);
      case 'rent':
        const rentA = calculateRent(a, dormitories.find(d => d.id === a.dormitoryId));
        const rentB = calculateRent(b, dormitories.find(d => d.id === b.dormitoryId));
        return direction * (rentA - rentB);
      case 'outstandingBalance':
        return direction * (a.outstandingBalance - b.outstandingBalance);
      default:
        return 0;
    }
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  // เพิ่มฟังก์ชันโหลดข้อมูลประวัติการใช้ไฟฟ้า
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

  // เพิ่มฟังก์ชันโหลดข้อมูลประวัติการชำระเงิน
  const loadPaymentHistories = async () => {
    const histories: Record<string, TenantPaymentHistory> = {};
    
    for (const tenant of tenants) {
      try {
        const billsRef = collection(db, `dormitories/${tenant.dormitoryId}/bills`);
        const q = query(
          billsRef,
          where('roomNumber', '==', tenant.roomNumber),
          orderBy('dueDate', 'desc')
        );
        const snapshot = await getDocs(q);
        
        let onTimeCount = 0;
        let lateCount = 0;
        let outstandingCount = 0;

        snapshot.docs.forEach(doc => {
          const bill = doc.data();
          if (bill.status === 'paid') {
            if (new Date(bill.paidDate) <= new Date(bill.dueDate)) {
              onTimeCount++;
            } else {
              lateCount++;
            }
          } else if (bill.status === 'pending') {
            outstandingCount++;
          }
        });

        histories[tenant.id] = {
          onTimeCount,
          lateCount,
          outstandingCount
        };
      } catch (error) {
        console.error('Error loading payment history for tenant:', tenant.id, error);
      }
    }
    
    setPaymentHistories(histories);
  };

  useEffect(() => {
    loadPaymentHistories();
  }, [tenants]);

  // แก้ไขฟังก์ชัน setSelectedTenantForView
  const handleViewTenant = async (tenant: Tenant) => {
    setSelectedTenantForView(tenant);
    await Promise.all([
      loadElectricityHistory(tenant.dormitoryId, tenant.roomNumber),
      loadPaymentHistories()
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Delete Modal */}
      <DeleteTenantModal
        isOpen={isDeleteModalOpen}
        tenant={selectedTenant}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTenant(null);
        }}
        onSuccess={() => {
          setIsDeleteModalOpen(false);
          setSelectedTenant(null);
          const loadTenants = async () => {
            try {
              const result = await queryTenants(selectedDormitory);
              if (result.success && result.data) {
                setTenants(result.data);
              }
            } catch (error) {
              console.error("Error loading tenants:", error);
              toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า");
            }
          };
          loadTenants();
          onRefresh();
        }}
      />

      {selectedTenants.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">
              เลือก {selectedTenants.length} รายการ
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

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้เช่า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTenants.length === filteredTenants.length}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">
                เลือกทั้งหมด ({selectedTenants.length}/{filteredTenants.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedTenants.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  ลบที่เลือก
                </button>
              )}
              <button
                onClick={onAddClick}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                เพิ่มผู้เช่า
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedTenants.length === filteredTenants.length}
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
                    onClick={() => handleSort('outstandingBalance')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    <div className="flex items-center gap-1">
                      ยอดค้างชำระ
                      <SortIcon field="outstandingBalance" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('dormitory')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    หอพัก
                    <SortIcon field="dormitory" />
                  </th>
                  <th
                    onClick={() => handleSort('roomNumber')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    เลขห้อง
                    <SortIcon field="roomNumber" />
                  </th>
                  <th
                    onClick={() => handleSort('startDate')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    วันที่เข้าพัก
                    <SortIcon field="startDate" />
                  </th>
                  <th
                    onClick={() => handleSort('deposit')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    เงินประกัน
                    <SortIcon field="deposit" />
                  </th>
                  <th
                    onClick={() => handleSort('rent')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  >
                    ค่าเช่า/เดือน
                    <SortIcon field="rent" />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTenants.map((tenant) => {
                  const dormitory = dormitories.find(
                    (d) => d.id === tenant.dormitoryId
                  );
                  const rent = calculateRent(tenant, dormitory);
                  const paymentHistory = paymentHistories[tenant.id] || {
                    onTimeCount: 0,
                    lateCount: 0,
                    outstandingCount: 0
                  };

                  return (
                    <tr key={tenant.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTenants.includes(tenant.id)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectTenant(tenant.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewTenant(tenant)}
                          className="text-sm text-gray-900 hover:text-blue-600 hover:underline text-left"
                        >
                          {tenant.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${tenant.outstandingBalance > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {tenant.outstandingBalance.toLocaleString()} บาท
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {dormitory?.name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          href={`/dormitories/${tenant.dormitoryId}/rooms?search=${tenant.roomNumber}`}
                          className="text-sm text-blue-600 hover:text-blue-900 hover:underline"
                        >
                          {tenant.roomNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(tenant.startDate).toLocaleDateString("th-TH")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {tenant.deposit.toLocaleString()} บาท
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {rent.toLocaleString()} บาท
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => onEdit(tenant)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(tenant.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedTenant && (
        <EditTenantModal
          isOpen={!!selectedTenant}
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onSuccess={() => {
            setSelectedTenant(null);
            // Refresh tenant list
            const loadTenants = async () => {
              try {
                const result = await queryTenants(selectedDormitory);
                if (result.success && result.data) {
                  setTenants(result.data);
                }
              } catch (error) {
                console.error("Error loading tenants:", error);
                toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เช่า");
              }
            };
            loadTenants();
          }}
          dormitories={dormitories}
        />
      )}

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
                        <span className="text-sm text-gray-500">เบอร์โทรศัพท์:</span>
                        <p className="text-sm font-medium text-gray-900">{selectedTenantForView.phone}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">อีเมล:</span>
                        <p className="text-sm font-medium text-gray-900">{selectedTenantForView.email || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Line ID:</span>
                        <p className="text-sm font-medium text-gray-900">{selectedTenantForView.lineId || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">ที่ทำงาน:</span>
                        <p className="text-sm font-medium text-gray-900">{selectedTenantForView.workplace || "-"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">ที่อยู่ปัจจุบัน:</span>
                        <p className="text-sm font-medium text-gray-900">{selectedTenantForView.currentAddress || "-"}</p>
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
                          {new Date(selectedTenantForView.startDate).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">เงินประกัน:</span>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTenantForView.deposit.toLocaleString()} บาท
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">จำนวนผู้พักอาศัย:</span>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTenantForView.numberOfResidents} คน
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedTenantForView.emergencyContact && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">ผู้ติดต่อฉุกเฉิน</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm text-gray-500">ชื่อ-นามสกุล:</span>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTenantForView.emergencyContact.name || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">ความสัมพันธ์:</span>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTenantForView.emergencyContact.relationship || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">เบอร์โทรศัพท์:</span>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedTenantForView.emergencyContact.phone || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* เพิ่มส่วนแสดงข้อมูลการเงินและการชำระเงิน */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">ข้อมูลการเงิน</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <span className="text-sm text-gray-500">รายได้รวมจากผู้เช่า:</span>
                      <p className="text-lg font-medium text-green-600">
                        {paymentHistories[selectedTenantForView?.id]?.onTimeCount.toLocaleString()} บาท
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <span className="text-sm text-gray-500">ค่าเช่าเฉลี่ยต่อเดือน:</span>
                      <p className="text-lg font-medium text-blue-600">
                        {paymentHistories[selectedTenantForView?.id]?.onTimeCount.toLocaleString()} บาท
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="text-sm text-gray-500">ประวัติการชำระเงิน:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{paymentHistories[selectedTenantForView?.id]?.onTimeCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm">{paymentHistories[selectedTenantForView?.id]?.lateCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-sm">{paymentHistories[selectedTenantForView?.id]?.outstandingCount}</span>
                        </div>
                      </div>
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
    </div>
  );
} 