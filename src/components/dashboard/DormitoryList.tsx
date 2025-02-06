"use client";

import { useState, useEffect } from "react";
import { queryDormitories } from "@/lib/firebase/firebaseUtils";
import { Dormitory } from "@/types/dormitory";
import { Building2, Users, Home } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function DormitoryList() {
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDormitories();
  }, []);

  const loadDormitories = async () => {
    try {
      const result = await queryDormitories();
      if (result.success && result.data) {
        setDormitories(result.data);
      } else {
        setDormitories([]);
      }
    } catch (error) {
      console.error("Error loading dormitories:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก");
      setDormitories([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (dormitories.length === 0) {
    return (
      <div className="text-center py-4">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่มีหอพัก</h3>
        <p className="mt-1 text-sm text-gray-500">เริ่มโดยการเพิ่มหอพักใหม่</p>
        <div className="mt-6">
          <Link
            href="/dormitories/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Home className="h-4 w-4 mr-2" />
            เพิ่มหอพัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <ul role="list" className="divide-y divide-gray-200">
        {dormitories.map((dormitory) => (
          <li key={dormitory.id}>
            <Link
              href={`/dormitories/${dormitory.id}`}
              className="block hover:bg-gray-50"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                    <p className="text-sm font-medium text-blue-600 truncate">
                      {dormitory.name}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {dormitory.status === "active" ? "เปิดให้บริการ" : "ปิดปรับปรุง"}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      <Home className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      {dormitory.totalRooms || 0} ห้อง
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      {dormitory.rooms?.filter(room => room.status === 'occupied').length || 0} ห้องที่มีผู้เช่า
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
} 