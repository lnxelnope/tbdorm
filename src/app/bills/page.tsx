"use client";

import { useState, useEffect } from "react";
import { queryDormitories, getRooms } from "@/lib/firebase/firebaseUtils";
import { getBillsByDormitory, getBankAccounts } from "@/lib/firebase/billUtils";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';
import { Dormitory, Room } from "@/types/dormitory";
import { Bill, BankAccount } from "@/types/bill";
import { ArrowUp, ArrowDown, Building, Receipt, CreditCard, QrCode } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import CreateBillModal from "./components/CreateBillModal";
import PaymentModal from "./components/PaymentModal";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function BillsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [selectedDormitory, setSelectedDormitory] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [promptPaySettings, setPromptPaySettings] = useState<{
    accountName: string;
    accountNumber: string;
    isActive: boolean;
  } | null>(null);

  // โหลดข้อมูลหอพักทั้งหมด
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await queryDormitories();
        if (result.success && result.data) {
          const dormsWithRooms = await Promise.all(
            result.data.map(async (dorm) => {
              const roomsResult = await getRooms(dorm.id);
              return {
                ...dorm,
                rooms: roomsResult.success ? roomsResult.data : []
              };
            })
          );
          setDormitories(dormsWithRooms);
          if (dormsWithRooms.length > 0) {
            setSelectedDormitory(dormsWithRooms[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // โหลดข้อมูลบิล
  useEffect(() => {
    const loadBills = async () => {
      if (!selectedDormitory) return;

      try {
        const result = await getBillsByDormitory(selectedDormitory, selectedMonth);
        if (result.success && result.data) {
          setBills(result.data);
        }
      } catch (error) {
        console.error("Error loading bills:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลบิล");
      }
    };

    loadBills();
  }, [selectedDormitory, selectedMonth]);

  // โหลดข้อมูลบัญชีรับเงิน
  useEffect(() => {
    const loadPaymentAccounts = async () => {
      try {
        // โหลดข้อมูลบัญชีธนาคาร
        const bankResult = await getBankAccounts('default');
        if (bankResult.success && bankResult.data) {
          setBankAccounts(bankResult.data);
        }

        // โหลดข้อมูล PromptPay
        const promptPayDoc = await getDoc(doc(db, 'settings', 'promptpay_default'));
        if (promptPayDoc.exists()) {
          const data = promptPayDoc.data();
          setPromptPaySettings({
            accountName: data.accountName,
            accountNumber: data.accountNumber,
            isActive: data.isActive
          });
        }
      } catch (error) {
        console.error('Error loading payment accounts:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลบัญชีรับเงิน');
      }
    };

    loadPaymentAccounts();
  }, []);

  // คำนวณสรุปการเงิน
  const financialSummary = {
    totalIncome: bills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0),
    pendingPayments: bills.reduce((sum, bill) => 
      bill.status === 'pending' ? sum + (bill.totalAmount - (bill.paidAmount || 0)) : sum, 0),
    totalBills: bills.length,
    paidBills: bills.filter(bill => bill.status === 'paid').length,
  };

  const handleCreateBill = (room: Room) => {
    setSelectedRoom(room);
    setIsCreateModalOpen(true);
  };

  const handlePayBill = (bill: Bill) => {
    setSelectedBill(bill);
    setIsPaymentModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedDorm = dormitories.find(d => d.id === selectedDormitory);

  return (
    <div className="p-6">
      {/* หัวข้อ */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">สรุปบิลและการชำระเงิน</h1>
        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-4">
            <select
              value={selectedDormitory}
              onChange={(e) => setSelectedDormitory(e.target.value)}
              className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {dormitories.map((dorm) => (
                <option key={dorm.id} value={dorm.id}>
                  {dorm.name}
                </option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* สรุปการเงิน */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">จำนวนบิลทั้งหมด</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{financialSummary.totalBills}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowUp className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">รายได้รวม</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      ฿{financialSummary.totalIncome.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowDown className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">ยอดค้างชำระ</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      ฿{financialSummary.pendingPayments.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Receipt className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">บิลที่ชำระแล้ว</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {((financialSummary.paidBills / financialSummary.totalBills) * 100).toFixed(1)}%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* บัญชีรับเงิน */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">บัญชีรับเงิน</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* บัญชีธนาคาร */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-blue-500" />
                <h4 className="font-medium">บัญชีธนาคาร</h4>
              </div>
              <div className="space-y-3">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="p-3 border border-gray-200 rounded-md">
                    <p className="font-medium">{account.bankName}</p>
                    <p className="text-sm text-gray-600">
                      {account.accountNumber} ({account.accountName})
                    </p>
                    <p className="text-sm text-gray-500">
                      {account.accountType === 'savings' ? 'ออมทรัพย์' : 'กระแสรายวัน'}
                      {account.branchName && ` - สาขา${account.branchName}`}
                    </p>
                  </div>
                ))}
                {bankAccounts.length === 0 && (
                  <p className="text-sm text-gray-500">ไม่พบข้อมูลบัญชีธนาคาร</p>
                )}
              </div>
            </div>

            {/* PromptPay */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-blue-500" />
                <h4 className="font-medium">PromptPay</h4>
              </div>
              {promptPaySettings?.isActive ? (
                <div className="p-3 border border-gray-200 rounded-md">
                  <p className="font-medium">{promptPaySettings.accountName}</p>
                  <p className="text-sm text-gray-600">{promptPaySettings.accountNumber}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">ไม่พบข้อมูล PromptPay หรือยังไม่ได้เปิดใช้งาน</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* รายการบิล */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h3 className="text-lg font-medium leading-6 text-gray-900">รายการบิล</h3>
              <p className="mt-2 text-sm text-gray-700">
                รายการบิลทั้งหมดของ {selectedDorm?.name} ประจำเดือน{' '}
                {new Date(selectedMonth).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                สร้างบิลใหม่
              </button>
            </div>
          </div>
          <div className="mt-8 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          ห้อง
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          รายการ
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          จำนวนเงิน
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          สถานะ
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          วันครบกำหนด
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {bills.map((bill) => {
                        const room = selectedDorm?.rooms?.find((r: Room) => r.id === bill.roomId);
                        return (
                          <tr key={bill.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              {room?.number}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {bill.items.map(item => item.description).join(', ')}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              ฿{bill.totalAmount.toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                bill.status === 'paid' 
                                  ? 'bg-green-100 text-green-800'
                                  : bill.status === 'overdue'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {bill.status === 'paid' && 'ชำระแล้ว'}
                                {bill.status === 'pending' && 'รอชำระ'}
                                {bill.status === 'overdue' && 'เกินกำหนด'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(bill.dueDate).toLocaleDateString('th-TH')}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              {bill.status !== 'paid' && (
                                <button
                                  onClick={() => handlePayBill(bill)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  ชำระเงิน
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedRoom && (
        <CreateBillModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedRoom(null);
          }}
          dormitoryId={selectedDormitory}
          room={selectedRoom}
          onBillCreated={() => {
            // Refresh bills
            getBillsByDormitory(selectedDormitory, selectedMonth).then(result => {
              if (result.success && result.data) {
                setBills(result.data);
              }
            });
          }}
        />
      )}

      {selectedBill && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedBill(null);
          }}
          bill={selectedBill}
          dormitoryId={selectedDormitory}
          onPaymentComplete={() => {
            // Refresh bills
            getBillsByDormitory(selectedDormitory, selectedMonth).then(result => {
              if (result.success && result.data) {
                setBills(result.data);
              }
            });
          }}
        />
      )}
    </div>
  );
} 