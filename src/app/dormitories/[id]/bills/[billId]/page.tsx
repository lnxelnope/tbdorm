"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Printer, Receipt } from "lucide-react";
import Link from "next/link";
import { Bill, Payment, Tenant } from "@/types/dormitory";
import { getBills, getPayments, queryTenants } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";

export default function BillDetailsPage({
  params,
}: {
  params: { id: string; billId: string };
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [bill, setBill] = useState<Bill | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    loadBillDetails();
  }, [params.id, params.billId]);

  const loadBillDetails = async () => {
    try {
      setIsLoading(true);
      const billsResult = await getBills(params.id);
      if (billsResult.success && billsResult.data) {
        const foundBill = billsResult.data.find((b) => b.id === params.billId);
        if (foundBill) {
          setBill(foundBill);

          // โหลดข้อมูลผู้เช่า
          const tenantsResult = await queryTenants(params.id);
          if (tenantsResult.success && tenantsResult.data) {
            const foundTenant = tenantsResult.data.find(
              (t) => t.id === foundBill.tenantId
            );
            if (foundTenant) {
              setTenant(foundTenant);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading bill details:", error);
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

  const getPaymentMethodText = (method: Payment["method"]) => {
    switch (method) {
      case "cash":
        return "เงินสด";
      case "transfer":
        return "โอนเงิน";
      case "promptpay":
        return "พร้อมเพย์";
      default:
        return method;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">กำลังโหลด...</div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">ไม่พบข้อมูลบิล</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link
            href={`/dormitories/${params.id}/bills`}
            className="text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            รายละเอียดบิล
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Printer className="w-4 h-4 mr-2" />
            พิมพ์
          </button>
          <Link
            href={`/dormitories/${params.id}/bills/${params.billId}/payment`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Receipt className="w-4 h-4 mr-2" />
            บันทึกการชำระ
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">ข้อมูลบิล</h2>
              <dl className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">เลขที่บิล</dt>
                  <dd className="text-sm text-gray-900">{bill.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">ห้อง</dt>
                  <dd className="text-sm text-gray-900">ห้อง {bill.roomId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">
                    ประจำเดือน
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(bill.year, bill.month - 1).toLocaleString("th-TH", {
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">
                    กำหนดชำระ
                  </dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(bill.dueDate).toLocaleDateString("th-TH")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">สถานะ</dt>
                  <dd className="text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        bill.status
                      )}`}
                    >
                      {getStatusText(bill.status)}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">ข้อมูลผู้เช่า</h2>
              <dl className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">ชื่อ-สกุล</dt>
                  <dd className="text-sm text-gray-900">{tenant?.name || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">
                    เบอร์โทรศัพท์
                  </dt>
                  <dd className="text-sm text-gray-900">{tenant?.phone || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Line ID</dt>
                  <dd className="text-sm text-gray-900">
                    {tenant?.lineId || "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                รายการ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                จำนวน
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                หน่วยละ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                จำนวนเงิน
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bill.items.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.description}
                  {item.utilityReading && (
                    <div className="text-xs text-gray-500">
                      เลขมิเตอร์: {item.utilityReading.previous} -{" "}
                      {item.utilityReading.current} ({item.utilityReading.units}{" "}
                      หน่วย)
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {item.quantity || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {item.unitPrice ? `฿${item.unitPrice.toLocaleString()}` : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ฿{item.amount.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-medium">
              <td
                colSpan={3}
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"
              >
                รวมทั้งสิ้น
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                ฿{bill.totalAmount.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        {bill.payments.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              ประวัติการชำระเงิน
            </h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ช่องทาง
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เลขอ้างอิง
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จำนวนเงิน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bill.payments.map((payment, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.paidAt).toLocaleString("th-TH")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodText(payment.method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.reference || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ฿{payment.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-medium">
                  <td
                    colSpan={3}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"
                  >
                    ชำระแล้ว
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ฿{bill.paidAmount.toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-gray-50 font-medium">
                  <td
                    colSpan={3}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right"
                  >
                    คงเหลือ
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ฿{bill.remainingAmount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 