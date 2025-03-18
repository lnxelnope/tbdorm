"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Printer, Receipt, FileDown } from "lucide-react";
import Link from "next/link";
import { Bill } from "@/types/dormitory";
import { Payment } from "@/types/bill";
import { Tenant } from "@/types/tenant";
import { getPayments, queryTenants, getDormitory } from "@/lib/firebase/firebaseUtils";
import { getBill, getBillPayments } from "@/lib/firebase/billUtils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

export default function BillDetailsPage({
  params,
}: {
  params: { id: string; billId: string };
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [bill, setBill] = useState<Bill | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [dormitoryName, setDormitoryName] = useState("");
  const [jsPDF, setJsPDF] = useState<any>(null);
  const [html2canvas, setHtml2canvas] = useState<any>(null);
  const searchParams = useSearchParams();
  const refreshParam = searchParams.get('refresh');

  // โหลดไลบรารีเมื่อ component mount
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        const jspdfModule = await import('jspdf');
        const html2canvasModule = await import('html2canvas');
        setJsPDF(() => jspdfModule.default);
        setHtml2canvas(() => html2canvasModule.default);
      } catch (error) {
        console.error('Error loading PDF libraries:', error);
      }
    };
    
    loadLibraries();
  }, []);

  const loadBillDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // ใช้ getBill แทน getBills เพื่อดึงข้อมูลบิลล่าสุดโดยตรง
      const billResult = await getBill(params.id, params.billId);
      
      if (billResult.success && billResult.data) {
        const foundBill = billResult.data;
        
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
        
        // โหลดข้อมูลหอพัก
        const dormResult = await getDormitory(params.id);
        if (dormResult.success && dormResult.data) {
          setDormitoryName(dormResult.data.name);
        }
        
        // โหลดข้อมูลการชำระเงินล่าสุด
        try {
          const paymentsResult = await getBillPayments(params.id, foundBill.id);
          if (paymentsResult.success && paymentsResult.data) {
            // กรองข้อมูลการชำระเงินที่ซ้ำกันโดยใช้ ID
            const uniquePayments = paymentsResult.data.filter((payment, index, self) => 
              index === self.findIndex(p => p.id === payment.id)
            );
            
            // คำนวณยอดชำระเงินทั้งหมดจากข้อมูลการชำระเงินล่าสุด
            const totalPaid = uniquePayments.reduce((sum: number, payment) => {
              return sum + Number(payment.amount);
            }, 0);
            
            // คำนวณยอดคงเหลือใหม่
            const remainingAmount = Number(foundBill.totalAmount) - totalPaid;
            
            // อัปเดตข้อมูลบิลด้วยข้อมูลการชำระเงินล่าสุดและยอดคงเหลือที่คำนวณใหม่
            setBill({
              ...foundBill,
              payments: uniquePayments,
              paidAmount: totalPaid,
              remainingAmount: remainingAmount
            } as unknown as Bill);
          } else {
            setBill(foundBill);
          }
        } catch (paymentError) {
          console.error("Error loading payments:", paymentError);
          setBill(foundBill);
        }
      }
    } catch (error) {
      console.error("Error loading bill details:", error);
      toast.error("ไม่สามารถโหลดข้อมูลบิลได้");
    } finally {
      setIsLoading(false);
    }
  }, [params.id, params.billId, refreshParam]);

  useEffect(() => {
    loadBillDetails();
  }, [loadBillDetails]);

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
      case "bank_transfer":
        return "โอนเงิน";
      case "promptpay":
        return "พร้อมเพย์";
      default:
        return method;
    }
  };

  // ฟังก์ชันสำหรับการสร้าง PDF
  const handleGeneratePDF = async () => {
    if (!bill) return;
    
    if (!jsPDF || !html2canvas) {
      toast.error("กำลังโหลดไลบรารี โปรดลองอีกครั้งในอีกสักครู่");
      return;
    }

    try {
      toast.info("กำลังสร้างไฟล์ PDF โปรดรอสักครู่...");
      
      // สร้าง PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // ใช้ element ที่มีอยู่แล้วในหน้า
      const element = document.getElementById('bill-printable');
      if (element) {
        const canvas = await html2canvas(element);
        const imgData = canvas.toDataURL('image/png');
        
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297 * canvas.height / canvas.width);
        
        // บันทึก PDF
        pdf.save(`บิล_${bill.roomId}_${bill.month}_${bill.year}.pdf`);
        
        toast.success("สร้างไฟล์ PDF เรียบร้อยแล้ว");
      } else {
        toast.error("ไม่พบข้อมูลบิลสำหรับสร้าง PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF");
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
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Printer className="w-4 h-4 mr-2" />
            พิมพ์
          </Button>
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FileDown className="w-4 h-4 mr-2" />
            สร้าง PDF
          </Button>
          <Link
            href={`/dormitories/${params.id}/bills/${params.billId}/payment`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Receipt className="w-4 h-4 mr-2" />
            บันทึกการชำระ
          </Link>
        </div>
      </div>

      {/* เพิ่ม style สำหรับการพิมพ์ */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #bill-printable, #bill-printable * {
            visibility: visible;
          }
          #bill-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ส่วนที่จะพิมพ์ */}
      <div id="bill-printable" className="bg-white shadow rounded-lg overflow-hidden p-6">
        <div className="flex justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">ใบแจ้งค่าเช่า</h2>
            <p className="text-gray-600">หอพัก: {dormitoryName}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">เลขที่: {bill.id}</p>
            <p className="font-medium">วันที่: {new Date(bill.createdAt).toLocaleDateString('th-TH')}</p>
            <p className="font-medium">กำหนดชำระ: {new Date(bill.dueDate).toLocaleDateString('th-TH')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-lg font-medium mb-2">ข้อมูลผู้เช่า</h3>
            <p>ชื่อผู้เช่า: {tenant?.name || "-"}</p>
            <p>ห้อง: {bill.roomId}</p>
            <p>โทร: {tenant?.phone || "-"}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">ข้อมูลบิล</h3>
            <p>ประจำเดือน: {new Date(bill.year, bill.month - 1).toLocaleString("th-TH", {
              month: "long",
              year: "numeric",
            })}</p>
            <p>สถานะ: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(bill.status)}`}>
              {getStatusText(bill.status)}
            </span></p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">รายละเอียดค่าใช้จ่าย</h3>
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
                        เลขมิเตอร์: {item.utilityReading.previousReading} -{" "}
                        {item.utilityReading.currentReading} ({item.utilityReading.unitsUsed}{" "}
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            {/* ข้อมูลการชำระเงิน */}
            <h3 className="text-lg font-medium mb-2">ข้อมูลการชำระเงิน</h3>
            <div className="space-y-1">
              <p className="font-medium">ยอดรวม: ฿{bill.totalAmount.toLocaleString()}</p>
              <p className="text-green-600 font-medium">ชำระแล้ว: ฿{bill.paidAmount.toLocaleString()}</p>
              <p className={`font-medium ${bill.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                คงเหลือ: ฿{bill.remainingAmount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                สถานะ: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(bill.status)}`}>
                  {getStatusText(bill.status)}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mt-4">
              หากมีข้อสงสัยกรุณาติดต่อเจ้าหน้าที่
            </p>
            <p className="text-sm text-gray-500">
              ขอบคุณที่ใช้บริการ
            </p>
          </div>
        </div>

        {/* ส่วนแสดงประวัติการชำระเงิน (ไม่แสดงในการพิมพ์) */}
        {bill.payments && bill.payments.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 mt-6 no-print">
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
                {/* ใช้ Set เพื่อเก็บ ID ที่แสดงไปแล้ว เพื่อป้องกันการแสดงซ้ำ */}
                {Array.from(new Set(bill.payments.map(payment => payment.id))).map(paymentId => {
                  const payment = bill.payments.find(p => p.id === paymentId);
                  if (!payment) return null;
                  
                  return (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.paidAt ? new Date(payment.paidAt).toLocaleString("th-TH") : "-"}
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
                  );
                })}
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