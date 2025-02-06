"use client";

import { useState, useEffect } from 'react';
import { getMaintenanceRequests, getMaintenanceStats } from '@/lib/firebase/maintenanceUtils';
import { MaintenanceRequest, MaintenanceStats } from '@/types/maintenance';
import { toast } from 'sonner';
import { Wrench, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import CreateMaintenanceModal from './components/CreateMaintenanceModal';
import MaintenanceRequestCard from './components/MaintenanceRequestCard';

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<MaintenanceRequest['status'] | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<MaintenanceRequest['priority'] | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // โหลดคำขอแจ้งซ่อมทั้งหมด
      const filters = {
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
        ...(selectedPriority !== 'all' && { priority: selectedPriority }),
      };
      
      const result = await getMaintenanceRequests('your-dormitory-id', filters);
      if (result.success && result.data) {
        const maintenanceData = Array.isArray(result.data) ? result.data : [result.data];
        setRequests(maintenanceData);
      }

      // โหลดสถิติ
      const statsResult = await getMaintenanceStats('your-dormitory-id');
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    loadData();
    toast.success('สร้างคำขอแจ้งซ่อมสำเร็จ');
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Wrench className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">คำขอทั้งหมด</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">รอดำเนินการ</p>
              <p className="text-2xl font-semibold">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">กำลังดำเนินการ</p>
              <p className="text-2xl font-semibold">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">เสร็จสิ้น</p>
              <p className="text-2xl font-semibold">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">ยกเลิก</p>
              <p className="text-2xl font-semibold">{stats.cancelled}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">ระบบแจ้งซ่อม</h1>
          <p className="mt-1 text-sm text-gray-500">
            จัดการคำขอแจ้งซ่อมและติดตามสถานะการดำเนินการ
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          แจ้งซ่อมใหม่
        </button>
      </div>

      {renderStats()}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as MaintenanceRequest['status'] | 'all')}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as MaintenanceRequest['priority'] | 'all')}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">ความเร่งด่วนทั้งหมด</option>
              <option value="high">สูง</option>
              <option value="medium">ปานกลาง</option>
              <option value="low">ต่ำ</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">กำลังโหลด...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <Wrench className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่มีคำขอแจ้งซ่อม</h3>
            <p className="mt-1 text-sm text-gray-500">เริ่มต้นโดยการสร้างคำขอแจ้งซ่อมใหม่</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((request) => (
              <MaintenanceRequestCard
                key={request.id}
                request={request}
                onStatusChange={loadData}
              />
            ))}
          </div>
        )}
      </div>

      <CreateMaintenanceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
} 