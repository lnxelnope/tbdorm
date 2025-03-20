"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Plus, Settings, Edit, Trash2, Home, Layers, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";
import { getDormitory, queryDormitories, deleteDormitory } from "@/lib/firebase/firebaseUtils";
import { Dormitory, RoomType } from "@/types/dormitory";
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

export default function DormitoriesPage() {
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchDormitories = async () => {
      try {
        console.log("Fetching dormitories...");
        const result = await queryDormitories();
        console.log("Query result:", result);
        if (result.success && result.data) {
          console.log("Setting dormitories:", result.data);
          setDormitories(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching dormitories:", error);
        toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDormitories();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("คุณต้องการลบหอพักนี้ใช่หรือไม่?")) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await deleteDormitory(id);
      if (result.success) {
        setDormitories(dormitories.filter((d) => d.id !== id));
        toast.success("ลบหอพักเรียบร้อย");
      } else {
        toast.error("ไม่สามารถลบหอพักได้");
      }
    } catch (error) {
      console.error("Error deleting dormitory:", error);
      toast.error("เกิดข้อผิดพลาดในการลบหอพัก");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">รายการหอพัก</h1>
          <p className="mt-1 text-sm text-gray-500">
            จัดการข้อมูลหอพักทั้งหมดของคุณ
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/dormitories/new">
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              เพิ่มหอพักใหม่
            </Button>
          </Link>
        </div>
      </div>

      {dormitories.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dormitories.map((dormitory) => (
            <div
              key={dormitory.id}
              className="bg-white overflow-hidden shadow rounded-lg border"
            >
              <div className="relative h-48">
                <Image 
                  src={dormitory.images[0] || '/placeholder-dorm.jpg'}
                  alt={dormitory.name}
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="absolute top-2 right-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      dormitory.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {dormitory.status === "active" ? "เปิดให้บริการ" : "ปิดปรับปรุง"}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {dormitory.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dormitories/${dormitory.id}/edit`}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                    >
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(dormitory.id)}
                      disabled={isDeleting}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">{dormitory.address}</p>
                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <Home className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                  <span>
                    {dormitory.totalRooms} ห้อง
                  </span>
                  <span className="mx-1">•</span>
                  <Layers className="flex-shrink-0 mx-1.5 h-5 w-5 text-gray-400" />
                  <span>
                    {dormitory.totalFloors} ชั้น
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {dormitory.facilities?.map((facility) => (
                      <span
                        key={facility}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">ราคาและค่าบริการ</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    {/* ราคาห้องพัก */}
                    {dormitory.config?.roomTypes && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-500">ราคาห้องพัก:</div>
                        {Object.values(dormitory.config.roomTypes)
                          .filter(type => type.isDefault)
                          .map(type => (
                            <div key={type.id} className="ml-2">
                              • {type.name}: {type.basePrice.toLocaleString()} บาท/เดือน
                            </div>
                        ))}
                      </div>
                    )}

                    {/* ค่าบริการเพิ่มเติม */}
                    {dormitory.config?.additionalFees?.items?.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-500">ค่าบริการเพิ่มเติม:</div>
                        {dormitory.config?.additionalFees?.items?.map((item) => (
                          <div key={item.id} className="ml-2">
                            • {item.name}: {item.amount.toLocaleString()} บาท/เดือน
                          </div>
                        ))}
                        {dormitory.config?.additionalFees?.floorRates && Object.entries(dormitory.config?.additionalFees?.floorRates)
                          .filter(([_, value]) => value !== null && value !== 0)
                          .map(([floor, value]) => value !== null && (
                            <div key={floor} className="ml-2">
                              • ชั้น {floor}: {value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString()} บาท
                            </div>
                          ))}
                      </div>
                    )}

                    {/* ค่าน้ำค่าไฟ */}
                    {dormitory.config?.additionalFees?.utilities && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-500">ค่าน้ำค่าไฟ:</div>
                        {dormitory.config.additionalFees.utilities.water?.perPerson !== null && (
                          <div className="ml-2">
                            • ค่าน้ำ: {dormitory.config.additionalFees.utilities.water.perPerson?.toLocaleString()} บาท/คน/เดือน
                          </div>
                        )}
                        {dormitory.config.additionalFees.utilities.electric?.unit !== null && (
                          <div className="ml-2">
                            • ค่าไฟ: {dormitory.config.additionalFees.utilities.electric.unit?.toLocaleString()} บาท/หน่วย
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-3">
                  <Link
                    href={`/dormitories/${dormitory.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    ดูรายละเอียด
                  </Link>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/dormitories/${dormitory.id}/config`}
                      className="flex items-center justify-center px-3 py-1.5 text-sm font-medium text-gray-600 border-2 border-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                    >
                      กำหนดราคา
                    </Link>
                    <Link
                      href={`/dormitories/${dormitory.id}/rooms`}
                      className="flex items-center justify-center px-3 py-1.5 text-sm font-medium text-green-600 border-2 border-green-600 rounded-lg hover:bg-green-50 transition-colors duration-150"
                    >
                      จัดการห้องพัก
                    </Link>
                  </div>
                </div>

                <div className="flex space-x-2 mt-4">
                  <Link
                    href={`/dormitories/${dormitory.id}/rooms`}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <Home className="w-3.5 h-3.5 mr-1" />
                    ห้องพัก
                  </Link>
                  <Link
                    href={`/dormitories/${dormitory.id}/config`}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1" />
                    ตั้งค่า
                  </Link>
                  <Link
                    href={`/dormitories/${dormitory.id}/bill-template`}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    <Layers className="w-3.5 h-3.5 mr-1" />
                    รูปแบบบิล
                  </Link>
                  <Link
                    href={`/dormitories/edit/${dormitory.id}`}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    แก้ไข
                  </Link>
                  <button
                    onClick={() => handleDelete(dormitory.id)}
                    disabled={isDeleting}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 