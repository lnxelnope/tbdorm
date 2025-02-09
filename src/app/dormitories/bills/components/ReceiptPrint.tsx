import { forwardRef } from 'react';
import { Bill } from '@/types/bill';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface ReceiptPrintProps {
  bill: Bill;
  dormitoryName: string;
  dormitoryAddress: string;
  roomNumber: string;
  tenantName: string;
}

const ReceiptPrint = forwardRef<HTMLDivElement, ReceiptPrintProps>(
  ({ bill, dormitoryName, dormitoryAddress, roomNumber, tenantName }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-white">
        {/* หัวกระดาษ */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{dormitoryName}</h1>
          <p className="text-gray-600">{dormitoryAddress}</p>
          <h2 className="text-xl font-semibold mt-4">ใบเสร็จรับเงิน</h2>
        </div>

        {/* ข้อมูลใบเสร็จ */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p><span className="font-semibold">ห้อง:</span> {roomNumber}</p>
            <p><span className="font-semibold">ผู้เช่า:</span> {tenantName}</p>
          </div>
          <div className="text-right">
            <p>
              <span className="font-semibold">วันที่:</span>{' '}
              {format(new Date(bill.paidAt || new Date()), 'dd MMMM yyyy', { locale: th })}
            </p>
            <p>
              <span className="font-semibold">เลขที่:</span>{' '}
              {bill.id}
            </p>
          </div>
        </div>

        {/* รายการ */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2">รายการ</th>
              <th className="text-right py-2">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-2">{item.description}</td>
                <td className="text-right py-2">฿{item.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-semibold">
              <td className="py-2">รวมทั้งสิ้น</td>
              <td className="text-right py-2">฿{bill.totalAmount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        {/* วิธีการชำระเงิน */}
        <div className="mb-6">
          <p>
            <span className="font-semibold">ชำระโดย:</span>{' '}
            {bill.paymentMethod === 'cash' && 'เงินสด'}
            {bill.paymentMethod === 'transfer' && 'โอนเงิน'}
            {bill.paymentMethod === 'promptpay' && 'พร้อมเพย์'}
          </p>
        </div>

        {/* ลายเซ็น */}
        <div className="grid grid-cols-2 gap-4 mt-12">
          <div className="text-center">
            <div className="border-t border-gray-300 w-48 mx-auto mt-16"></div>
            <p>ผู้รับเงิน</p>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-300 w-48 mx-auto mt-16"></div>
            <p>ผู้จ่ายเงิน</p>
          </div>
        </div>

        {/* หมายเหตุ */}
        <div className="mt-8 text-sm text-gray-500">
          <p>หมายเหตุ:</p>
          <p>1. ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์ต่อเมื่อได้รับชำระเงินเรียบร้อยแล้ว</p>
          <p>2. กรุณาเก็บใบเสร็จรับเงินไว้เป็นหลักฐาน</p>
        </div>
      </div>
    );
  }
);

ReceiptPrint.displayName = 'ReceiptPrint';

export default ReceiptPrint; 