"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { FileText, Receipt } from "lucide-react";

interface BillDetailsProps {
  bill: {
    id: string;
    dormitoryId: string;
    roomNumber: string;
    tenantName: string;
    totalAmount: number;
    status: string;
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
  };
  onClose: () => void;
  onUpdate: () => void;
}

export default function BillDetails({ bill, onClose, onUpdate }: BillDetailsProps) {
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(bill.totalAmount - (bill.paidAmount || 0));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentEvidence, setPaymentEvidence] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !paymentMethod) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setIsSubmitting(true);
      const billRef = doc(db, `dormitories/${bill.dormitoryId}/bills/${bill.id}`);
      const newPaidAmount = (bill.paidAmount || 0) + paymentAmount;
      const newStatus = newPaidAmount >= bill.totalAmount ? "paid" : "partially_paid";

      await updateDoc(billRef, {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: Timestamp.now(),
        paymentMethod,
        paymentEvidence,
      });

      onUpdate();
      setIsRecordingPayment(false);
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกการชำระเงิน");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "ชำระแล้ว";
      case "overdue":
        return "เกินกำหนด";
      case "partially_paid":
        return "ชำระบางส่วน";
      default:
        return "รอชำระ";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-green-600";
      case "overdue":
        return "text-red-600";
      case "partially_paid":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold">รายละเอียดบิล</h2>
          <p className="text-sm text-gray-500">เลขที่บิล: {bill.id}</p>
        </div>
        <div className={`text-sm font-medium ${getStatusColor(bill.status)}`}>
          {getStatusText(bill.status)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>ห้อง</Label>
          <p className="mt-1">{bill.roomNumber}</p>
        </div>
        <div>
          <Label>ผู้เช่า</Label>
          <p className="mt-1">{bill.tenantName}</p>
        </div>
        <div>
          <Label>วันที่สร้าง</Label>
          <p className="mt-1">{bill.createdAt.toLocaleDateString("th-TH")}</p>
        </div>
        <div>
          <Label>วันครบกำหนด</Label>
          <p className="mt-1">{bill.dueDate.toLocaleDateString("th-TH")}</p>
        </div>
      </div>

      <div>
        <Label>รายการ</Label>
        <div className="mt-2 space-y-2">
          {bill.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium">{item.type}</p>
                {item.description && (
                  <p className="text-sm text-gray-500">{item.description}</p>
                )}
              </div>
              <p>{item.amount.toLocaleString()} บาท</p>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 font-medium">
            <p>ยอดรวม</p>
            <p>{bill.totalAmount.toLocaleString()} บาท</p>
          </div>
          {bill.paidAmount && bill.paidAmount > 0 && (
            <>
              <div className="flex justify-between items-center pt-2 text-green-600">
                <p>ชำระแล้ว</p>
                <p>{bill.paidAmount.toLocaleString()} บาท</p>
              </div>
              <div className="flex justify-between items-center pt-2 text-red-600">
                <p>คงเหลือ</p>
                <p>{(bill.totalAmount - bill.paidAmount).toLocaleString()} บาท</p>
              </div>
            </>
          )}
        </div>
      </div>

      {bill.status !== "paid" && !isRecordingPayment && (
        <div className="flex justify-end">
          <Button onClick={() => setIsRecordingPayment(true)}>
            <Receipt className="h-4 w-4 mr-2" />
            บันทึกการชำระเงิน
          </Button>
        </div>
      )}

      {isRecordingPayment && (
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <h3 className="font-medium">บันทึกการชำระเงิน</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentAmount">จำนวนเงิน</Label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                max={bill.totalAmount - (bill.paidAmount || 0)}
                required
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">วิธีการชำระเงิน</Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                required
              >
                <option value="">เลือกวิธีการชำระเงิน</option>
                <option value="cash">เงินสด</option>
                <option value="transfer">โอนเงิน</option>
                <option value="promptpay">พร้อมเพย์</option>
              </select>
            </div>
            <div>
              <Label htmlFor="paymentEvidence">หลักฐานการชำระเงิน (ถ้ามี)</Label>
              <Input
                id="paymentEvidence"
                value={paymentEvidence}
                onChange={(e) => setPaymentEvidence(e.target.value)}
                placeholder="เลขที่อ้างอิง หรือ URL รูปภาพสลิป"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRecordingPayment(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกการชำระเงิน"}
            </Button>
          </div>
        </form>
      )}

      {bill.status === "paid" && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Receipt className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="font-medium text-green-700">ชำระเงินแล้ว</p>
              <p className="text-sm text-green-600">
                เมื่อ {bill.paidAt?.toLocaleDateString("th-TH")}
              </p>
              {bill.paymentMethod && (
                <p className="text-sm text-green-600">
                  วิธีการชำระเงิน: {bill.paymentMethod}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          ปิด
        </Button>
      </div>
    </div>
  );
} 