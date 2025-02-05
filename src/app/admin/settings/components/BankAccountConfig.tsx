"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { saveBankAccount, getBankAccounts, deleteBankAccount } from '@/lib/firebase/billUtils';
import { BankAccount } from '@/types/bill';
import { Dialog } from '@headlessui/react';
import { Trash2, Plus } from 'lucide-react';

const THAI_BANKS = [
  'ธนาคารกรุงเทพ',
  'ธนาคารกสิกรไทย',
  'ธนาคารไทยพาณิชย์',
  'ธนาคารกรุงไทย',
  'ธนาคารกรุงศรีอยุธยา',
  'ธนาคารทหารไทยธนชาต',
  'ธนาคารออมสิน',
  'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร',
];

export default function BankAccountConfig() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    accountType: 'savings' as 'savings' | 'current',
    branchName: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const result = await getBankAccounts('default');
      if (result.success && result.data) {
        setAccounts(result.data);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลบัญชีธนาคาร');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const accountData = {
        ...newAccount,
        dormitoryId: 'default',
        isActive: true,
      };

      const result = await saveBankAccount(accountData);
      
      if (result.success && result.data) {
        toast.success('บันทึกบัญชีธนาคารสำเร็จ');
        setAccounts([...accounts, result.data]);
        setNewAccount({
          bankName: '',
          accountName: '',
          accountNumber: '',
          accountType: 'savings',
          branchName: '',
        });
        setIsModalOpen(false);
      } else {
        throw new Error('ไม่สามารถบันทึกบัญชีธนาคาร');
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกบัญชีธนาคาร');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('คุณต้องการลบบัญชีธนาคารนี้ใช่หรือไม่?')) return;
    
    try {
      const result = await deleteBankAccount(accountId);
      if (result.success) {
        setAccounts(accounts.filter(acc => acc.id !== accountId));
        toast.success('ลบบัญชีธนาคารสำเร็จ');
      } else {
        throw new Error('ไม่สามารถลบบัญชีธนาคาร');
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast.error('เกิดข้อผิดพลาดในการลบบัญชีธนาคาร');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">บัญชีธนาคาร</h3>
          <p className="mt-1 text-sm text-gray-500">
            จัดการบัญชีธนาคารสำหรับรับชำระเงิน
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มบัญชี
        </button>
      </div>

      {/* รายการบัญชีธนาคาร */}
      <div className="grid gap-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
          >
            <div>
              <p className="font-medium">{account.bankName}</p>
              <p className="text-sm text-gray-600">
                {account.accountNumber} ({account.accountName})
              </p>
              <p className="text-sm text-gray-500">
                {account.accountType === 'savings' ? 'ออมทรัพย์' : 'กระแสรายวัน'}
                {account.branchName && ` - สาขา${account.branchName}`}
              </p>
            </div>
            <button
              onClick={() => handleDelete(account.id)}
              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Modal เพิ่มบัญชีใหม่ */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black bg-opacity-25" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                เพิ่มบัญชีธนาคาร
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ธนาคาร</label>
                  <select
                    value={newAccount.bankName}
                    onChange={(e) => setNewAccount({ ...newAccount, bankName: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">เลือกธนาคาร</option>
                    {THAI_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">ชื่อบัญชี</label>
                  <input
                    type="text"
                    value={newAccount.accountName}
                    onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">เลขที่บัญชี</label>
                  <input
                    type="text"
                    value={newAccount.accountNumber}
                    onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                    required
                    pattern="\d{10}"
                    title="กรุณากรอกเลขที่บัญชี 10 หลัก"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">ประเภทบัญชี</label>
                  <select
                    value={newAccount.accountType}
                    onChange={(e) => setNewAccount({ ...newAccount, accountType: e.target.value as 'savings' | 'current' })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="savings">ออมทรัพย์</option>
                    <option value="current">กระแสรายวัน</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">สาขา (ถ้ามี)</label>
                  <input
                    type="text"
                    value={newAccount.branchName}
                    onChange={(e) => setNewAccount({ ...newAccount, branchName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? 'กำลังบันทึก...' : 'เพิ่มบัญชี'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </div>
  );
} 