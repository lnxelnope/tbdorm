"use client";

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { createMaintenanceRequest, uploadMaintenanceImage } from '@/lib/firebase/maintenanceUtils';

const schema = z.object({
  title: z.string().min(1, 'กรุณาระบุหัวข้อ'),
  description: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  roomNumber: z.string().min(1, 'กรุณาระบุหมายเลขห้อง'),
  priority: z.enum(['high', 'medium', 'low']),
});

interface CreateMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FormData = z.infer<typeof schema>;

export default function CreateMaintenanceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateMaintenanceModalProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files);
      if (selectedImages.length + newImages.length > 5) {
        toast.error('สามารถอัพโหลดรูปได้สูงสุด 5 รูป');
        return;
      }
      setSelectedImages([...selectedImages, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      // อัพโหลดรูปภาพ
      const imageUrls = await Promise.all(
        selectedImages.map(file => uploadMaintenanceImage(file))
      );

      // สร้างคำขอแจ้งซ่อม
      const result = await createMaintenanceRequest({
        ...data,
        images: imageUrls.filter((url): url is string => url !== null),
        status: 'pending',
        requesterUid: 'user-id', // TODO: ใช้ ID จริงของผู้ใช้
        requesterName: 'User Name', // TODO: ใช้ชื่อจริงของผู้ใช้
        createdAt: new Date().toISOString(),
      });

      if (result.success) {
        reset();
        setSelectedImages([]);
        onSuccess();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างคำขอแจ้งซ่อม');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded bg-white p-6">
          <Dialog.Title className="text-lg font-medium mb-4">
            แจ้งซ่อมใหม่
          </Dialog.Title>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">หัวข้อ</label>
              <input
                type="text"
                {...register('title')}
                className="w-full px-3 py-2 border rounded-md"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">รายละเอียด</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border rounded-md"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">หมายเลขห้อง</label>
              <input
                type="text"
                {...register('roomNumber')}
                className="w-full px-3 py-2 border rounded-md"
              />
              {errors.roomNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.roomNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ความเร่งด่วน</label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="low">ต่ำ</option>
                <option value="medium">ปานกลาง</option>
                <option value="high">สูง</option>
              </select>
              {errors.priority && (
                <p className="text-red-500 text-sm mt-1">{errors.priority.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">รูปภาพ (สูงสุด 5 รูป)</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                เลือกรูปภาพ
              </button>

              {selectedImages.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 