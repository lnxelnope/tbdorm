"use client";

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { updateBillStatus, createPaymentReceipt, getBankAccounts, addPayment } from '@/lib/firebase/billUtils';
import { Bill, BankAccount, Payment } from '@/types/bill';
import Image from 'next/image';
import { X } from 'lucide-react';
import { uploadPaymentEvidence } from '@/lib/firebase/storage';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill;
  dormitoryId: string;
  onPaymentComplete: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  bill,
  dormitoryId,
  onPaymentComplete
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let evidenceUrl = '';
      if (paymentProof) {
        const uploadResult = await uploadPaymentEvidence(
          dormitoryId,
          bill.id,
          paymentProof
        );
        if (uploadResult.success) {
          evidenceUrl = uploadResult.url;
        }
      }

      const payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> = {
        billId: bill.id,
        dormitoryId,
        amount,
        method: paymentMethod,
        status: 'completed',
        reference,
        evidence: evidenceUrl,
        paidAt: new Date(transferDate || new Date())
      };

      const paymentResult = await addPayment(dormitoryId, payment);
      if (!paymentResult.success) {
        throw new Error('Failed to add payment');
      }

      const newPaidAmount = bill.paidAmount + amount;
      const newStatus = newPaidAmount >= bill.totalAmount ? 'paid' : 'partially_paid';

      const updateResult = await updateBillStatus(dormitoryId, bill.id, {
        status: newStatus,
        paidAmount: newPaidAmount,
        remainingAmount: bill.totalAmount - newPaidAmount
      });

      if (updateResult.success) {
        toast.success('บันทึกการชำระเงินเรียบร้อยแล้ว');
        onPaymentComplete();
        onClose();
      } else {
        throw new Error('Failed to update bill status');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกการชำระเงิน');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-xl bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
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

            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการชำระเงิน'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 