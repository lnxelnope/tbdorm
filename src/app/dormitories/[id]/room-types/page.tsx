"use client";

import { useState, useEffect, useCallback } from "react";
import { RoomType } from "@/types/dormitory";
import { getRoomTypes, addRoomType, updateRoomType, deleteRoomType } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import Modal from "@/components/ui/modal";

interface FormData {
  name: string;
  basePrice: number;
  description: string;
  isDefault: boolean;
  facilities: string[];
  size: string;
}

export default function RoomTypesPage({ params }: { params: { id: string } }) {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    basePrice: 0,
    description: "",
    isDefault: false,
    facilities: [],
    size: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadRoomTypes = useCallback(async () => {
    try {
      setIsLoading(true);
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
  }, [params.id]);

  useEffect(() => {
    loadRoomTypes();
  }, [loadRoomTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.basePrice <= 0) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingType) {
        const result = await updateRoomType(params.id, editingType.id, formData);
        if (result.success) {
          toast.success("อัพเดทรูปแบบห้องเรียบร้อย");
          setShowAddModal(false);
          loadRoomTypes();
        }
      } else {
        const result = await addRoomType(params.id, formData);
        if (result.success) {
          toast.success("เพิ่มรูปแบบห้องเรียบร้อย");
          setShowAddModal(false);
          loadRoomTypes();
        }
      }
    } catch (error) {
      console.error("Error submitting room type:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
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
      description: type.description || "",
      isDefault: type.isDefault || false,
      facilities: type.facilities || [],
      size: type.size || ""
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      basePrice: 0,
      description: "",
      isDefault: false,
      facilities: [],
      size: ""
    });
    setEditingType(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">รูปแบบห้องพัก</h1>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          เพิ่มรูปแบบห้อง
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ชื่อ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ราคา
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ค่าเริ่มต้น
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roomTypes.map((type) => (
              <tr key={type.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {type.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {type.basePrice.toLocaleString()} บาท
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {type.isDefault ? "ใช่" : "ไม่"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(type)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingType ? "แก้ไขรูปแบบห้อง" : "เพิ่มรูปแบบห้อง"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ชื่อประเภทห้อง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ราคาพื้นฐาน (บาท/เดือน) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300"
                />
              </div>
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
                placeholder="กรุณากรอกรายละเอียด"
                className="mt-1"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  ตั้งเป็นค่าเริ่มต้น
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
} 