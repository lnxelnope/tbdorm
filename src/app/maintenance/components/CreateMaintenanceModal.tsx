"use client";

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import { createMaintenanceRequest, uploadMaintenanceImage } from '@/lib/firebase/maintenanceUtils';
import { useAuth } from '@/lib/hooks/useAuth';

interface CreateMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const schema = z.object({
  title: z.string().min(1, 'กรุณาระบุหัวข้อ'),
  description: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  roomNumber: z.string().min(1, 'กรุณาระบุหมายเลขห้อง'),
  priority: z.enum(['high', 'medium', 'low']),
});

type FormData = z.infer<typeof schema>;

export default function CreateMaintenanceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateMaintenanceModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'medium',
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast.error('สามารถอัพโหลดรูปได้สูงสุด 5 รูป');
      return;
    }

    const newFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        newFiles.push(file);
        newPreviewUrls.push(URL.createObjectURL(file));
      }
    });

    setSelectedImages([...selectedImages, ...newFiles]);
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    const newPreviewUrls = [...previewUrls];
    
    URL.revokeObjectURL(newPreviewUrls[index]);
    newImages.splice(index, 1);
    newPreviewUrls.splice(index, 1);
    
    setSelectedImages(newImages);
    setPreviewUrls(newPreviewUrls);
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error('กรุณาเข้าสู่ระบบก่อนแจ้งซ่อม');
      return;
    }

    try {
      setIsSubmitting(true);

      // อัพโหลดรูปภาพ
      const imageUrls = await Promise.all(
        selectedImages.map((file) => uploadMaintenanceImage(file))
      );

      // สร้างคำขอแจ้งซ่อม
      const result = await createMaintenanceRequest({
        ...data,
        requesterUid: user.uid,
        requesterName: user.displayName || 'ไม่ระบุชื่อ',
        images: imageUrls.filter((url): url is string => typeof url === 'string'),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      if (result.success) {
        reset();
        setSelectedImages([]);
        setPreviewUrls([]);
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
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />

        <div className="relative mx-auto w-full max-w-md rounded-lg bg-white p-6">
          <div className="mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              แจ้งซ่อมใหม่
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-gray-500">
              กรอกรายละเอียดการแจ้งซ่อมของคุณ
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                หัวข้อ
              </label>
              <input
                type="text"
                {...register('title')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                รายละเอียด
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                หมายเลขห้อง
              </label>
              <input
                type="text"
                {...register('roomNumber')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              {errors.roomNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.roomNumber.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ความเร่งด่วน
              </label>
              <select
                {...register('priority')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="high">สูง</option>
                <option value="medium">ปานกลาง</option>
                <option value="low">ต่ำ</option>
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.priority.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                รูปภาพ (สูงสุด 5 รูป)
              </label>
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
                className="mt-1 flex w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 px-6 py-4 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Upload className="mr-2 h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">อัพโหลดรูปภาพ</span>
              </button>

              {previewUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <div className="relative h-24 w-full overflow-hidden rounded-lg">
                        <Image
                          src={url}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
} 