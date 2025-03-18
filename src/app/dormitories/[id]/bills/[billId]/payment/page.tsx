"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Bill, Payment } from "@/types/dormitory";
import {
  getBills,
  addPayment,
  getPromptPayConfig,
  getLineNotifyConfig,
  updateBillStatus,
} from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { sendPaymentReceivedNotification } from "@/lib/notifications/lineNotify";
import Image from 'next/image';

export default function PaymentPage({
  params,
}: {
  params: { id: string; billId: string };
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);
  const [promptPayConfig, setPromptPayConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: "",
    method: "cash" as Payment["method"],
    reference: "",
    evidence: "",
    paidAt: new Date().toISOString().split("T")[0],
  });

  const loadBillDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const [billsResult, promptPayResult] = await Promise.all([
        getBills(params.id),
        getPromptPayConfig(params.id),
      ]);

      if (billsResult.success && billsResult.data) {
        const foundBill = billsResult.data.find((b) => b.id === params.billId);
        if (foundBill) {
          setBill(foundBill);
          setFormData((prev) => ({
            ...prev,
            amount: foundBill.remainingAmount.toString(),
          }));
        }
      }

      if (promptPayResult.success && promptPayResult.data) {
        setPromptPayConfig(promptPayResult.data);
      }
    } catch (error) {
      console.error("Error loading bill details:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  }, [params.id, params.billId]);

  useEffect(() => {
    loadBillDetails();
  }, [loadBillDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("กรุณาระบุจำนวนเงินให้ถูกต้อง");
      return;
    }

    if (amount > bill.remainingAmount) {
      toast.error("จำนวนเงินเกินยอดคงเหลือ");
      return;
    }

    if (formData.method !== "cash" && !formData.reference) {
      toast.error("กรุณาระบุเลขอ้างอิงการชำระเงิน");
      return;
    }

    try {
      setIsSubmitting(true);
      const paymentData: Omit<Payment, "id" | "createdAt" | "updatedAt"> = {
        billId: bill.id,
        dormitoryId: params.id,
        tenantId: bill.tenantId,
        amount,
        method: formData.method,
        reference: formData.reference || undefined,
        evidence: formData.evidence || undefined,
        paidAt: new Date(formData.paidAt),
        status: "completed",
      };

      const result = await addPayment(params.id, paymentData);
      if (result.success) {
        // อัพเดทสถานะบิล
        const newPaidAmount = (bill.paidAmount || 0) + amount;
        const newRemainingAmount = bill.totalAmount - newPaidAmount;
        const newStatus = newRemainingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partially_paid' : 'pending';

        await updateBillStatus(params.id, bill.id, {
          status: newStatus,
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
        });

        // ส่งแจ้งเตือนผ่าน LINE
        const lineConfig = await getLineNotifyConfig(params.id);
        if (lineConfig.success && lineConfig.data) {
          await sendPaymentReceivedNotification(lineConfig.data, {
            ...bill,
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus,
          }, amount);
        }

        toast.success("บันทึกการชำระเงินเรียบร้อย");
        
        // รีเฟรชข้อมูลบิลก่อนกลับไปหน้ารายละเอียดบิล
        router.push(`/dormitories/${params.id}/bills/${params.billId}?refresh=${Date.now()}`);
      }
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกการชำระเงิน");
    } finally {
      setIsSubmitting(false);
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
      <div className="flex items-center mb-6">
        <Link
          href={`/dormitories/${params.id}/bills/${params.billId}`}
          className="text-gray-500 hover:text-gray-700 mr-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          บันทึกการชำระเงิน
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    จำนวนเงิน
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">฿</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      className="block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    วิธีการชำระเงิน
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        method: e.target.value as Payment["method"],
                      })
                    }
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    required
                  >
                    <option value="cash">เงินสด</option>
                    <option value="transfer">โอนเงิน</option>
                    <option value="promptpay">พร้อมเพย์</option>
                  </select>
                </div>

                {formData.method !== "cash" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เลขอ้างอิง/เลขที่รายการ
                    </label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) =>
                        setFormData({ ...formData, reference: e.target.value })
                      }
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    วันที่ชำระ
                  </label>
                  <input
                    type="date"
                    value={formData.paidAt}
                    onChange={(e) =>
                      setFormData({ ...formData, paidAt: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Link
                href={`/dormitories/${params.id}/bills/${params.billId}`}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกการชำระ"}
              </button>
            </div>
          </form>
        </div>

        <div>
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              ข้อมูลการชำระเงิน
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">เลขที่บิล</dt>
                <dd className="mt-1 text-sm text-gray-900">{bill.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ห้อง</dt>
                <dd className="mt-1 text-sm text-gray-900">ห้อง {bill.roomId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ประจำเดือน</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(bill.year, bill.month - 1).toLocaleString("th-TH", {
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ยอดรวม</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  ฿{bill.totalAmount.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ชำระแล้ว</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  ฿{bill.paidAmount.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">คงเหลือ</dt>
                <dd className="mt-1 text-sm font-medium text-red-600">
                  ฿{bill.remainingAmount.toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {promptPayConfig && formData.method === "promptpay" && (
            <div className="mt-6 bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                ข้อมูล PromptPay
              </h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">ชื่อบัญชี</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {promptPayConfig.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    หมายเลข PromptPay
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {promptPayConfig.number}
                  </dd>
                </div>
                {promptPayConfig.qrCode && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">QR Code</dt>
                    <dd className="mt-1">
                      <Image
                        src={promptPayConfig.qrCode}
                        alt="PromptPay QR Code"
                        width={192}
                        height={192}
                        className="rounded-lg shadow-md"
                      />
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 