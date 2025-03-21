"use client";

import { useState } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { MaintenanceRequest } from '@/types/maintenance';
import { updateMaintenanceStatus } from '@firebase/maintenanceUtils';
import { toast } from 'sonner';
import { AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface MaintenanceRequestCardProps {
  request: MaintenanceRequest;
  onStatusChange: () => void;
}

const statusConfig = {
  pending: {
    label: 'รอดำเนินการ',
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
  },
  in_progress: {
    label: 'กำลังดำเนินการ',
    icon: Clock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  completed: {
    label: 'เสร็จสิ้น',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  cancelled: {
    label: 'ยกเลิก',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
};

const priorityConfig = {
  high: {
    label: 'สูง',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  medium: {
    label: 'ปานกลาง',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  low: {
    label: 'ต่ำ',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
};

export default function MaintenanceRequestCard({ request, onStatusChange }: MaintenanceRequestCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const status = statusConfig[request.status];
  const priority = priorityConfig[request.priority];
  const StatusIcon = status.icon;

  const handleStatusChange = async (newStatus: MaintenanceRequest['status']) => {
    try {
      setIsUpdating(true);
      const result = await updateMaintenanceStatus(request.id, newStatus);
      if (result.success) {
        onStatusChange();
        toast.success('อัพเดทสถานะสำเร็จ');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">
              {request.title}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
              <StatusIcon className="mr-1 h-4 w-4" />
              {status.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priority.bgColor} ${priority.color}`}>
              {priority.label}
            </span>
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            <p>ห้อง: {request.roomNumber}</p>
            <p>แจ้งโดย: {request.requesterName}</p>
            <p>วันที่แจ้ง: {format(new Date(request.createdAt), 'PPP', { locale: th })}</p>
          </div>

          <p className="mt-2 text-sm text-gray-700">{request.description}</p>

          {request.images && request.images.length > 0 && (
            <div className="mt-4 flex gap-2">
              {request.images.map((image, index) => (
                <div key={index} className="relative h-20 w-20">
                  <Image
                    src={image}
                    alt={`รูปภาพที่ ${index + 1}`}
                    fill
                    className="rounded-lg object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ml-4">
          <select
            value={request.status}
            onChange={(e) => handleStatusChange(e.target.value as MaintenanceRequest['status'])}
            disabled={isUpdating}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>
      </div>
    </div>
  );
} 