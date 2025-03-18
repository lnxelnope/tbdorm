import React from "react";
import { Bill, BillItem } from "@/types/bill";
import { Room } from "@/types/dormitory";
import { Tenant } from "@/types/tenant";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Clock, CreditCard, Calendar, User, Home, Receipt, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BillDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  room?: Room | null;
  tenant?: Tenant | null;
  onRecordPayment?: () => void;
}

export default function BillDetailsModal({
  isOpen,
  onClose,
  bill,
  room,
  tenant,
  onRecordPayment
}: BillDetailsModalProps) {
  if (!bill) return null;

  const getBillStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "รอชำระ";
      case "paid":
        return "ชำระแล้ว";
      case "partially_paid":
        return "ชำระบางส่วน";
      case "overdue":
        return "เกินกำหนด";
      case "cancelled":
        return "ยกเลิก";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "partially_paid":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายละเอียดบิล</DialogTitle>
          <DialogDescription>
            บิลประจำเดือน {bill.month}/{bill.year} สำหรับห้อง {room?.number}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium">บิลห้อง {room?.number}</h3>
              <p className="text-sm text-gray-500">
                {tenant?.name || "-"}
              </p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
              {getBillStatusText(bill.status)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">ประจำเดือน:</span>{' '}
              {`${bill.month}/${bill.year}`}
            </div>
            <div>
              <span className="text-gray-500">วันที่สร้าง:</span>{' '}
              {bill.createdAt instanceof Date
                ? format(bill.createdAt, 'dd/MM/yyyy')
                : format(new Date(bill.createdAt), 'dd/MM/yyyy')}
            </div>
            <div>
              <span className="text-gray-500">กำหนดชำระ:</span>{' '}
              {bill.dueDate instanceof Date
                ? format(bill.dueDate, 'dd/MM/yyyy')
                : format(new Date(bill.dueDate), 'dd/MM/yyyy')}
            </div>
            <div>
              <span className="text-gray-500">สถานะ:</span>{' '}
              {getBillStatusText(bill.status)}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium text-gray-700 mb-2">รายการ</h4>
            <div className="space-y-2">
              {bill.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.unit && item.price
                        ? `${item.unit} หน่วย × ${formatCurrency(item.price)}`
                        : item.description || ''}
                    </div>
                  </div>
                  <div className="font-medium">{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between font-medium text-lg">
            <span>ยอดรวม</span>
            <span>{formatCurrency(bill.totalAmount)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>ชำระแล้ว</span>
            <span>{formatCurrency(bill.paidAmount)}</span>
          </div>

          <div className="flex justify-between font-medium">
            <span>คงเหลือ</span>
            <span>{formatCurrency(bill.totalAmount - bill.paidAmount)}</span>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium text-gray-700 mb-2">ประวัติการชำระเงิน</h4>
            {bill.payments && bill.payments.length > 0 ? (
              <div className="space-y-2">
                {bill.payments.map((payment, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {payment.method}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      <div>
                        วันที่: {payment.date instanceof Date
                          ? format(payment.date, 'dd/MM/yyyy')
                          : format(new Date(payment.date), 'dd/MM/yyyy')}
                      </div>
                      <div>
                        บันทึกโดย: {payment.recordedBy || payment.createdBy || 'ไม่ระบุ'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">ยังไม่มีประวัติการชำระเงิน</p>
            )}
          </div>

          {bill.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-gray-700 mb-2">หมายเหตุ</h4>
                <p className="text-sm">{bill.notes}</p>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              ปิด
            </Button>
            {bill.status !== 'paid' && bill.status !== 'cancelled' && (
              <Button onClick={onRecordPayment}>
                <CreditCard className="mr-2 h-4 w-4" />
                บันทึกการชำระเงิน
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 