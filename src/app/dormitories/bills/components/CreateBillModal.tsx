"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createBill } from '@/lib/firebase/billUtils';
import { Bill, BillItem } from '@/types/bill';
import { Room } from '@/types/dormitory';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedRoom: Room | null;
  dormitoryId: string;
}

export default function CreateBillModal({
  isOpen,
  onClose,
  onSuccess,
  selectedRoom,
  dormitoryId
}: CreateBillModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const billData = {
        dormitoryId,
        roomNumber: selectedRoom?.number || '',
        tenantId: selectedRoom?.tenantId || '',
        tenantName: selectedRoom?.tenantName || '',
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
      };

      // ลองสร้างบิลแบบปกติก่อน
      const result = await createBill(dormitoryId, billData, false);

      if (result.success) {
        toast.success('สร้างบิลเรียบร้อยแล้ว');
        onSuccess();
        onClose();
      } else {
        // ถ้าเกิดข้อผิดพลาดเกี่ยวกับบิลซ้ำ ให้ถามผู้ใช้ว่าต้องการสร้างบิลซ้ำหรือไม่
        if (result.error?.toString().includes('มีบิลสำหรับห้อง')) {
          if (window.confirm(`${result.error} ต้องการสร้างบิลซ้ำหรือไม่?`)) {
            // ถ้าผู้ใช้ยืนยัน ให้สร้างบิลซ้ำโดยส่ง forceCreate เป็น true
            const forceResult = await createBill(dormitoryId, billData, true);
            
            if (forceResult.success) {
              toast.success('สร้างบิลเรียบร้อยแล้ว');
              onSuccess();
              onClose();
            } else {
              toast.error(forceResult.error?.toString() || 'ไม่สามารถสร้างบิลได้');
            }
          }
        } else {
          toast.error(result.error?.toString() || 'ไม่สามารถสร้างบิลได้');
        }
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างบิล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สร้างบิลใหม่</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                ห้อง
              </label>
              <p className="mt-1 text-sm text-gray-900">{selectedRoom?.number}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ผู้เช่า
              </label>
              <p className="mt-1 text-sm text-gray-900">{selectedRoom?.tenantName || '-'}</p>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                'สร้างบิล'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 