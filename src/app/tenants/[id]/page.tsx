"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, User, Phone, Mail, Home, Calendar, Users, CreditCard, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Tenant, Bill } from "@/types/dormitory";
import { queryTenants, getBills } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";

export default function TenantDetailsPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    loadTenantDetails();
  }, [params.id]);

  const loadTenantDetails = async () => {
    try {
      setIsLoading(true);
      // ดึงข้อมูลผู้เช่า
      const tenantsResult = await queryTenants();
      if (tenantsResult.success && tenantsResult.data) {
        const foundTenant = tenantsResult.data.find(t => t.id === params.id);
        if (foundTenant) {
          setTenant(foundTenant);

          // ดึงข้อมูลบิลของผู้เช่า
          const billsResult = await getBills(foundTenant.dormitoryId, {
            tenantId: foundTenant.id
          });
          if (billsResult.success && billsResult.data) {
            setBills(billsResult.data);
          }
        }
      }
    } catch (error) {
      console.error("Error loading tenant details:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">กำลังโหลด...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">ไม่พบข้อมูลผู้เช่า</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link
          href="/tenants"
          className="text-gray-500 hover:text-gray-700 mr-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          ข้อมูลผู้เช่า
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* ข้อมูลทั่วไป */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลทั่วไป</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">ชื่อ-สกุล</dt>
                  <dd className="text-sm text-gray-900">{tenant.name}</dd>
                </div>
              </div>
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">เลขบัตรประชาชน</dt>
                  <dd className="text-sm text-gray-900">{tenant.idCard}</dd>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</dt>
                  <dd className="text-sm text-gray-900">{tenant.phone}</dd>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">อีเมล</dt>
                  <dd className="text-sm text-gray-900">{tenant.email || "-"}</dd>
                </div>
              </div>
              <div className="flex items-center">
                <Home className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">ที่อยู่ปัจจุบัน</dt>
                  <dd className="text-sm text-gray-900">{tenant.currentAddress || "-"}</dd>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">วันที่เข้าพัก</dt>
                  <dd className="text-sm text-gray-900">{new Date(tenant.startDate).toLocaleDateString("th-TH")}</dd>
                </div>
              </div>
              <div className="flex items-center">
                <Users className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">จำนวนผู้พักอาศัย</dt>
                  <dd className="text-sm text-gray-900">{tenant.numberOfResidents} คน</dd>
                </div>
              </div>
            </dl>
          </div>

          {/* ผู้ติดต่อฉุกเฉิน */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">ผู้ติดต่อฉุกเฉิน</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">ชื่อ-สกุล</dt>
                <dd className="text-sm text-gray-900">{tenant.emergencyContact.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ความสัมพันธ์</dt>
                <dd className="text-sm text-gray-900">{tenant.emergencyContact.relationship}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</dt>
                <dd className="text-sm text-gray-900">{tenant.emergencyContact.phone}</dd>
              </div>
            </dl>
          </div>

          {/* ประวัติการชำระเงิน */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">ประวัติการชำระเงิน</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(bill.year, bill.month - 1).toLocaleString("th-TH", {
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ฿{bill.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ฿{bill.paidAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/dormitories/${tenant.dormitoryId}/bills/${bill.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          ดูรายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* สรุปข้อมูล */}
        <div>
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">สรุปข้อมูล</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">ห้องพัก</dt>
                <dd className="mt-1 text-sm text-gray-900">ห้อง {tenant.roomNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">เงินประกัน</dt>
                <dd className="mt-1 text-sm text-gray-900">฿{tenant.deposit.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ยอดค้างชำระ</dt>
                <dd className="mt-1 text-sm font-medium text-red-600">
                  ฿{(tenant.outstandingBalance || 0).toLocaleString()}
                </dd>
              </div>
              {(tenant.outstandingBalance || 0) > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        มียอดค้างชำระที่ต้องดำเนินการ
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
} 