"use client";

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { updateBillStatus, getBankAccounts, addPayment } from '@firebase/billUtils';
import { Bill, BankAccount, Payment } from '@/types/bill';
import Image from 'next/image';
import { X } from 'lucide-react';
import { uploadPaymentEvidence } from '@firebase/storage';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentData: {
    amount: number;
    method: string;
    date: Date;
    notes?: string;
    slipUrl?: string;
  }) => void;
  bill: Bill;
  dormitoryId: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  bill,
  dormitoryId
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'promptpay'>('cash');
  const [amount, setAmount] = useState(bill.totalAmount - (bill.paidAmount || 0));
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [transferDate, setTransferDate] = useState('');
  const [reference, setReference] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (paymentMethod === 'transfer') {
        setIsLoading(true);
        try {
          const result = await getBankAccounts(dormitoryId);
          if (result.success && result.data) {
            setBankAccounts(result.data);
          }
        } catch (error) {
          console.error('Error fetching bank accounts:', error);
          toast.error('ไม่สามารถดึงข้อมูลบัญชีธนาคารได้');
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchBankAccounts();
  }, [dormitoryId, paymentMethod]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("เริ่มกระบวนการบันทึกการชำระเงิน:", {
        billId: bill.id,
        dormitoryId,
        amount,
        method: paymentMethod,
        transferDate,
        reference
      });

      // ตรวจสอบข้อมูลที่จำเป็น
      if (amount <= 0) {
        toast.error('กรุณาระบุจำนวนเงินที่ถูกต้อง');
        setIsSubmitting(false);
        return;
      }

      if (amount > (bill.totalAmount - bill.paidAmount)) {
        toast.error('จำนวนเงินที่ชำระเกินยอดค้างชำระ');
        setIsSubmitting(false);
        return;
      }

      // ตรวจสอบข้อมูลเพิ่มเติมตามวิธีการชำระเงิน
      if (paymentMethod === 'transfer') {
        if (!selectedBank) {
          toast.error('กรุณาเลือกบัญชีธนาคาร');
          setIsSubmitting(false);
          return;
        }
        
        if (!transferDate) {
          toast.error('กรุณาระบุวันที่โอน');
          setIsSubmitting(false);
          return;
        }
        
        if (!reference) {
          toast.error('กรุณาระบุเลขที่อ้างอิง/เลขที่รายการ');
          setIsSubmitting(false);
          return;
        }
      }

      if ((paymentMethod === 'transfer' || paymentMethod === 'promptpay') && !paymentProof) {
        toast.error('กรุณาอัปโหลดหลักฐานการโอนเงิน');
        setIsSubmitting(false);
        return;
      }

      let evidenceUrl = '';
      if (paymentProof) {
        console.log("กำลังอัปโหลดหลักฐานการชำระเงิน...");
        try {
          const uploadResult = await uploadPaymentEvidence(
            dormitoryId,
            bill.id,
            paymentProof
          );
          console.log("ผลการอัปโหลด:", uploadResult);
          if (uploadResult.success) {
            evidenceUrl = uploadResult.url;
          } else {
            throw new Error('อัปโหลดหลักฐานการชำระเงินไม่สำเร็จ');
          }
        } catch (uploadError) {
          console.error("เกิดข้อผิดพลาดในการอัปโหลดหลักฐาน:", uploadError);
          toast.error('เกิดข้อผิดพลาดในการอัปโหลดหลักฐานการชำระเงิน');
          setIsSubmitting(false);
          return;
        }
      }

      console.log("กำลังบันทึกข้อมูลการชำระเงิน...");
      const payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> = {
        billId: bill.id,
        dormitoryId,
        amount,
        method: paymentMethod,
        status: 'completed',
        reference,
        evidence: evidenceUrl,
        paidAt: paymentMethod === 'transfer' && transferDate 
          ? new Date(transferDate) 
          : new Date()
      };

      console.log("ข้อมูลการชำระเงินที่จะบันทึก:", payment);
      const paymentResult = await addPayment(dormitoryId, payment);
      console.log("ผลการบันทึกการชำระเงิน:", paymentResult);
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'บันทึกการชำระเงินไม่สำเร็จ');
      }

      const newPaidAmount = bill.paidAmount + amount;
      const newStatus = newPaidAmount >= bill.totalAmount ? 'paid' : 'partially_paid';

      console.log("กำลังอัปเดตสถานะบิล:", {
        billId: bill.id,
        newStatus,
        newPaidAmount,
        remainingAmount: bill.totalAmount - newPaidAmount
      });
      
      const updateResult = await updateBillStatus(dormitoryId, bill.id, {
        status: newStatus,
        paidAmount: newPaidAmount,
        remainingAmount: bill.totalAmount - newPaidAmount
      });
      
      console.log("ผลการอัปเดตสถานะบิล:", updateResult);

      if (updateResult.success) {
        toast.success('บันทึกการชำระเงินเรียบร้อยแล้ว');
        onSuccess({
          amount,
          method: paymentMethod,
          date: paymentMethod === 'transfer' && transferDate 
            ? new Date(transferDate) 
            : new Date(),
          slipUrl: evidenceUrl
        });
        onClose();
      } else {
        throw new Error(updateResult.error || 'อัปเดตสถานะบิลไม่สำเร็จ');
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการบันทึกการชำระเงิน:", error);
      
      // แสดงข้อความ error ที่ชัดเจนมากขึ้น
      if (error instanceof Error) {
        toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึกการชำระเงิน');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ฟังก์ชั่นป้องกันการส่งต่อเหตุการณ์ scroll
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Container - ป้องกันไม่ให้ scroll ไปยังพื้นหลัง */}
      <div className="fixed inset-0 flex items-center justify-center overflow-hidden" onClick={handleContentClick}>
        <div className="w-full max-w-2xl mx-auto">
          <Dialog.Panel className="bg-white rounded-xl shadow-xl flex flex-col max-h-[90vh] transform transition-all">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-white z-10">
              <Dialog.Title className="text-lg font-semibold">
                ชำระเงิน
              </Dialog.Title>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content - ส่วนที่เลื่อนได้ */}
            <div className="flex-1 overflow-y-auto" onScroll={(e) => e.stopPropagation()}>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ยอดรวม
                  </label>
                  <p className="mt-1 text-sm text-gray-900">฿{bill.totalAmount.toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ชำระแล้ว
                  </label>
                  <p className="mt-1 text-sm text-gray-900">฿{bill.paidAmount.toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ค้างชำระ
                  </label>
                  <p className="mt-1 text-sm text-gray-900">฿{(bill.totalAmount - bill.paidAmount).toLocaleString()}</p>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    จำนวนเงินที่ต้องการชำระ
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min={0}
                    max={bill.totalAmount - bill.paidAmount}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="method" className="block text-sm font-medium text-gray-700">
                    วิธีการชำระเงิน
                  </label>
                  <select
                    id="method"
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value as 'cash' | 'transfer' | 'promptpay');
                      setSelectedBank(null);
                      setTransferDate('');
                      setReference('');
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="cash">เงินสด</option>
                    <option value="transfer">โอนเงิน</option>
                    <option value="promptpay">พร้อมเพย์</option>
                  </select>
                </div>

                {paymentMethod === 'transfer' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">เลือกบัญชีธนาคาร</label>
                      <select
                        value={selectedBank?.id || ''}
                        onChange={(e) => {
                          const bank = bankAccounts.find(b => b.id === e.target.value);
                          setSelectedBank(bank || null);
                        }}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">เลือกบัญชี</option>
                        {bankAccounts.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.bankName} - {bank.accountNumber} ({bank.accountName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">วันที่โอน</label>
                      <input
                        type="datetime-local"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">เลขที่อ้างอิง/เลขที่รายการ</label>
                      <input
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="เช่น 202402141234"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}

                {(paymentMethod === 'transfer' || paymentMethod === 'promptpay') && (
                  <div>
                    <label className="block text-sm font-medium mb-1">หลักฐานการโอนเงิน</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                      className="w-full"
                    />
                    {paymentProof && (
                      <div className="mt-2">
                        <Image
                          src={URL.createObjectURL(paymentProof)}
                          alt="หลักฐานการโอนเงิน"
                          width={200}
                          height={200}
                          className="rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button */}
                <div className="sticky bottom-0 pt-4 pb-2 bg-white border-t border-gray-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการชำระเงิน'}
                  </button>
                </div>
              </form>
            </div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
} 