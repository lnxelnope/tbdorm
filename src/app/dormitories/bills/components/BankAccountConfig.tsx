"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { updateBankAccountConfig } from '@/lib/firebase/billsUtils';

const schema = z.object({
  bankName: z.string().min(1, 'กรุณาระบุชื่อธนาคาร'),
  accountNumber: z.string().min(10, 'กรุณาระบุเลขบัญชีให้ถูกต้อง'),
  accountName: z.string().min(1, 'กรุณาระบุชื่อบัญชี'),
});

type FormData = z.infer<typeof schema>;

interface BankAccountConfigProps {
  settings: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
}

export default function BankAccountConfig({ settings }: BankAccountConfigProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankName: settings?.bankName || '',
      accountNumber: settings?.accountNumber || '',
      accountName: settings?.accountName || '',
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await updateBankAccountConfig(data);
      
      if (result.success) {
        toast.success('บันทึกการตั้งค่าบัญชีธนาคารสำเร็จ');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating bank account config:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกการตั้งค่าบัญชีธนาคาร');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">ตั้งค่าบัญชีธนาคาร</h3>
        <p className="text-sm text-gray-500">
          กำหนดข้อมูลบัญชีธนาคารสำหรับรับชำระค่าเช่า
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            ธนาคาร
          </label>
          <select
            {...register('bankName')}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">เลือกธนาคาร</option>
            <option value="กรุงเทพ">ธนาคารกรุงเทพ</option>
            <option value="กสิกรไทย">ธนาคารกสิกรไทย</option>
            <option value="กรุงไทย">ธนาคารกรุงไทย</option>
            <option value="ไทยพาณิชย์">ธนาคารไทยพาณิชย์</option>
            <option value="ทหารไทยธนชาต">ธนาคารทหารไทยธนชาต</option>
            <option value="กรุงศรี">ธนาคารกรุงศรีอยุธยา</option>
            <option value="ออมสิน">ธนาคารออมสิน</option>
            <option value="ธกส">ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร</option>
          </select>
          {errors.bankName && (
            <p className="text-red-500 text-sm mt-1">{errors.bankName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            เลขบัญชี
          </label>
          <input
            type="text"
            {...register('accountNumber')}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="เลขบัญชีธนาคาร"
          />
          {errors.accountNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.accountNumber.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            ชื่อบัญชี
          </label>
          <input
            type="text"
            {...register('accountName')}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="ชื่อ-นามสกุล หรือชื่อนิติบุคคล"
          />
          {errors.accountName && (
            <p className="text-red-500 text-sm mt-1">{errors.accountName.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  );
} 