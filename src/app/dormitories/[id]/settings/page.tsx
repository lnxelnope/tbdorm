"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RoomType } from "@/types/dormitory";
import { getRoomTypes, addRoomType, updateRoomType, deleteRoomType } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";

interface FormData extends Omit<RoomType, 'id'> {
  name: string;
  basePrice: number;
  isDefault: boolean;
  description: string;
  airConditionerFee: number;
  parkingFee: number;
}

export default function SettingsPage({ params }: { params: { id: string } }) {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    basePrice: 0,
    isDefault: false,
    description: "",
    airConditionerFee: 0,
    parkingFee: 0,
  });

  useEffect(() => {
    loadRoomTypes();
  }, [params.id]);

  const loadRoomTypes = async () => {
    try {
      const result = await getRoomTypes(params.id);
      if (result.success && result.data) {
        setRoomTypes(result.data);
      }
    } catch (error) {
      console.error("Error loading room types:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("กรุณากรอกชื่อรูปแบบห้อง");
      return;
    }

    try {
      if (editingType) {
        // อัพเดทรูปแบบห้อง
        const result = await updateRoomType(params.id, editingType.id, formData);
        if (result.success) {
          toast.success("แก้ไขรูปแบบห้องเรียบร้อย");
          setEditingType(null);
        }
      } else {
        // เพิ่มรูปแบบห้องใหม่
        const result = await addRoomType(params.id, formData);
        if (result.success) {
          toast.success("เพิ่มรูปแบบห้องเรียบร้อย");
          setShowAddModal(false);
        }
      }
      
      // โหลดข้อมูลใหม่
      loadRoomTypes();
      
      // รีเซ็ตฟอร์ม
      setFormData({
        name: "",
        basePrice: 0,
        isDefault: false,
        description: "",
        airConditionerFee: 0,
        parkingFee: 0,
      });
    } catch (error) {
      console.error("Error saving room type:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleDelete = async (typeId: string) => {
    if (!confirm("ต้องการลบรูปแบบห้องนี้ใช่หรือไม่?")) {
      return;
    }

    try {
      const result = await deleteRoomType(params.id, typeId);
      if (result.success) {
        toast.success("ลบรูปแบบห้องเรียบร้อย");
        loadRoomTypes();
      }
    } catch (error) {
      console.error("Error deleting room type:", error);
      toast.error("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  const handleEdit = (type: RoomType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      basePrice: type.basePrice,
      isDefault: type.isDefault || false,
      description: type.description || "",
      airConditionerFee: type.airConditionerFee || 0,
      parkingFee: type.parkingFee || 0,
    });
    setShowAddModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link
              href={`/dormitories/${params.id}`}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              กลับ
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">ตั้งค่าหอพัก</h1>
          <p className="mt-1 text-sm text-gray-500">
            กำหนดรูปแบบห้องพักและค่าบริการเพิ่มเติม
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          เพิ่มรูปแบบห้อง
        </button>
      </div>

      {/* รายการรูปแบบห้อง */}
      <div className="bg-white shadow rounded-lg">
        <ul className="divide-y divide-gray-200">
          {roomTypes.map((type) => (
            <li key={type.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {type.name}
                    {type.isDefault && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                        ค่าเริ่มต้น
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500">{type.description}</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {type.basePrice.toLocaleString()} บาท/เดือน
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(type)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal เพิ่ม/แก้ไขรูปแบบห้อง */}
      {(showAddModal || editingType) && (
        <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingType ? "แก้ไขรูปแบบห้อง" : "เพิ่มรูปแบบห้อง"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ชื่อรูปแบบห้อง
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ราคา/เดือน
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.basePrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        basePrice: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    รายละเอียด
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) =>
                      setFormData({ ...formData, isDefault: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    ตั้งเป็นค่าเริ่มต้น
                  </label>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingType(null);
                      setFormData({
                        name: "",
                        basePrice: 0,
                        isDefault: false,
                        description: "",
                        airConditionerFee: 0,
                        parkingFee: 0,
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingType ? "บันทึกการแก้ไข" : "เพิ่ม"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 