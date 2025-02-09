"use client";

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { createBill } from '@/lib/firebase/billUtils';
import { Bill, BillItem } from '@/types/bill';
import { Room } from '@/types/dormitory';
import { X } from 'lucide-react';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormitoryId: string;
  room: Room;
  onBillCreated: () => void;
}

export default function CreateBillModal({
  isOpen,
  onClose,
  dormitoryId,
  room,
  onBillCreated
}: CreateBillModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // สร้างบิลใหม่
      const result = await createBill({
        dormitoryId,
        roomNumber: room.number,
        tenantName: room.tenantName || '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        dueDate: new Date(),
        status: 'pending',
        items: [],
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        payments: [],
        notificationsSent: {
          initial: false,
          reminder: false,
          overdue: false
        }
      });

      if (result.success) {
        toast.success('สร้างบิลเรียบร้อยแล้ว');
        onBillCreated();
        onClose();
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการสร้างบิล');
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างบิล');
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
              สร้างบิลใหม่
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
                ห้อง
              </label>
              <p className="mt-1 text-sm text-gray-900">{room.number}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ผู้เช่า
              </label>
              <p className="mt-1 text-sm text-gray-900">{room.tenantName || '-'}</p>
            </div>

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
                {isSubmitting ? 'กำลังสร้าง...' : 'สร้างบิล'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 