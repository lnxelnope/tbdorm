import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { updateBillStatus, createPaymentReceipt, getBankAccounts } from '@/lib/firebase/billUtils';
import { Bill, BankAccount } from '@/types/bill';
import Image from 'next/image';

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
  const [paymentMethod, setPaymentMethod] = useState<Bill['paymentMethod']>('cash');
  const [amount, setAmount] = useState(bill.totalAmount - (bill.paidAmount || 0));
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [transferDate, setTransferDate] = useState('');
  const [reference, setReference] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        const result = await getBankAccounts(dormitoryId);
        if (result.success && result.data) {
          setBankAccounts(result.data);
        }
      } catch (error) {
        console.error('Error loading bank accounts:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลบัญชีธนาคาร');
      }
    };

    if (isOpen && paymentMethod === 'bank_transfer') {
      loadBankAccounts();
    }
  }, [isOpen, dormitoryId, paymentMethod]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const paymentDetails: Parameters<typeof updateBillStatus>[2] = {
        paymentMethod,
        paidAmount: amount,
        paymentProof: paymentProof ? URL.createObjectURL(paymentProof) : undefined,
      };

      if (paymentMethod === 'bank_transfer' && selectedBank) {
        paymentDetails.bankTransferInfo = {
          bankName: selectedBank.bankName,
          accountNumber: selectedBank.accountNumber,
          transferDate,
          transferAmount: amount,
          reference,
        };
      }

      const updateResult = await updateBillStatus(bill.id, 'paid', paymentDetails);

      if (!updateResult.success) {
        throw new Error('ไม่สามารถอัพเดทสถานะบิลได้');
      }

      // สร้างใบเสร็จ
      const receiptNumber = `RCP${Date.now()}`;
      const receiptResult = await createPaymentReceipt({
        billId: bill.id,
        amount,
        paymentMethod,
        paymentDate: new Date().toISOString(),
        receiptNumber
      });

      if (!receiptResult.success) {
        throw new Error('ไม่สามารถสร้างใบเสร็จได้');
      }

      toast.success('บันทึกการชำระเงินสำเร็จ');
      onPaymentComplete();
      onClose();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกการชำระเงิน');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg w-full max-w-md">
          <div className="p-6">
            <Dialog.Title className="text-lg font-semibold mb-4">
              ชำระเงิน
            </Dialog.Title>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">วิธีการชำระเงิน</label>
                  <select
                    value={paymentMethod || 'cash'}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value as Bill['paymentMethod']);
                      setSelectedBank(null);
                      setTransferDate('');
                      setReference('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">เงินสด</option>
                    <option value="bank_transfer">โอนเงินผ่านบัญชีธนาคาร</option>
                    <option value="promptpay">พร้อมเพย์</option>
                  </select>
                </div>

                {paymentMethod === 'bank_transfer' && (
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

                <div>
                  <label className="block text-sm font-medium mb-1">จำนวนเงิน</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min={0}
                    max={bill.totalAmount - (bill.paidAmount || 0)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {(paymentMethod === 'bank_transfer' || paymentMethod === 'promptpay') && (
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

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? 'กำลังบันทึก...' : 'บันทึกการชำระเงิน'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 