"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { updatePromptPayConfig } from '@firebase/billsUtils';

const schema = z.object({
  promptPayId: z.string().min(1, 'กรุณาระบุหมายเลข PromptPay'),
  promptPayName: z.string().min(1, 'กรุณาระบุชื่อบัญชี PromptPay'),
});

type FormData = z.infer<typeof schema>;

interface PromptPayConfigProps {
  settings: {
    promptPayId?: string;
    promptPayName?: string;
  };
}

export default function PromptPayConfig({ settings }: PromptPayConfigProps) {
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      promptPayId: settings?.promptPayId || '',
      promptPayName: settings?.promptPayName || '',
    }
  });

  const promptPayId = watch('promptPayId');

  const generateQRCode = (id: string, amount: number) => {
    if (!id) return '';
    
    // ตัวอย่างการสร้าง QR Code สำหรับ PromptPay
    // อ้างอิงจาก: https://github.com/dtinth/promptpay-qr
    const version = '000201';  // เวอร์ชัน
    const method = '010211';   // ชำระเงินด้วย PromptPay
    const merchantInfo = `2937${id.length.toString().padStart(2, '0')}${id}`;
    const countryCode = '5802TH';
    const currencyCode = '5303764';
    const amountStr = amount.toFixed(2);
    const amountField = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
    const checksum = '6304';   // จะคำนวณ CRC16 ทีหลัง

    return `${version}${method}${merchantInfo}${countryCode}${currencyCode}${amountField}${checksum}`;
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await updatePromptPayConfig(data);
      
      if (result.success) {
        toast.success('บันทึกการตั้งค่า PromptPay สำเร็จ');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating PromptPay config:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า PromptPay');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">ตั้งค่า PromptPay</h3>
        <p className="text-sm text-gray-500">
          กำหนดหมายเลข PromptPay และชื่อบัญชีสำหรับรับชำระค่าเช่า
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            หมายเลข PromptPay
          </label>
          <input
            type="text"
            {...register('promptPayId')}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="เบอร์โทรศัพท์หรือเลขประจำตัวประชาชน"
          />
          {errors.promptPayId && (
            <p className="text-red-500 text-sm mt-1">{errors.promptPayId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            ชื่อบัญชี PromptPay
          </label>
          <input
            type="text"
            {...register('promptPayName')}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="ชื่อ-นามสกุล หรือชื่อนิติบุคคล"
          />
          {errors.promptPayName && (
            <p className="text-red-500 text-sm mt-1">{errors.promptPayName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            ทดสอบ QR Code
          </label>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="จำนวนเงิน"
                min="0"
                step="0.01"
              />
            </div>
            <div className="w-32 h-32 bg-white p-2 border rounded-md">
              {promptPayId && paymentAmount > 0 ? (
                <QRCodeSVG
                  value={generateQRCode(promptPayId, paymentAmount)}
                  size={112}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm text-center">
                  กรุณาระบุหมายเลข PromptPay และจำนวนเงิน
                </div>
              )}
            </div>
          </div>
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