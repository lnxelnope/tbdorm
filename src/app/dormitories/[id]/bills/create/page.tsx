"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Bill, Room, RoomType } from "@/types/dormitory";
import { Tenant } from "@/types/tenant";
import { toast } from "sonner";
import {
  getBills,
  addPayment,
  getPromptPayConfig,
  getLineNotifyConfig,
  getRooms,
  queryTenants,
  getRoomTypes,
} from "@/lib/firebase/firebaseUtils";
import { createBill } from "@/lib/firebase/billUtils";
import { sendBillCreatedNotification } from "@/lib/notifications/lineNotify";

interface BillItem {
  type: 'rent' | 'water' | 'electric' | 'other';
  name: string;
  amount: number;
  unit?: number;
  rate?: number;
  description?: string;
}

interface FormData {
  month: number;
  year: number;
  dueDate: string;
  items: Array<{
    name: string;
    amount: number;
    type: 'rent' | 'water' | 'electric' | 'parking' | 'air_conditioner' | 'other';
    description: string;
  }>;
}

export default function CreateBillPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    dueDate: new Date().toISOString().split("T")[0],
    items: [
      { 
        name: "", 
        amount: 0,
        type: 'other',
        description: ''
      }
    ],
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [roomsResult, roomTypesResult, tenantsResult] = await Promise.all([
        getRooms(params.id),
        getRoomTypes(params.id),
        queryTenants(params.id),
      ]);

      if (roomsResult.success && roomsResult.data) {
        setRooms(roomsResult.data);
      }
      if (roomTypesResult.success && roomTypesResult.data) {
        setRoomTypes(roomTypesResult.data);
      }
      if (tenantsResult.success && tenantsResult.data) {
        setTenants(tenantsResult.data);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedRoom) {
    toast.error("กรุณาเลือกห้อง");
    return;
  }

  try {
    setIsSubmitting(true);
    const room = rooms.find((r) => r.id === selectedRoom);
    const tenant = tenants.find((t) => t.roomNumber === room?.number);
    if (!room || !tenant) {
      toast.error("ไม่พบข้อมูลห้องหรือผู้เช่า");
      return;
    }

    const totalAmount = formData.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );

      const billData = {
      dormitoryId: params.id,
      roomId: room.number,
      tenantId: tenant.id,
      month: formData.month,
      year: formData.year,
      dueDate: formData.dueDate,
      status: "pending" as const,
      items: formData.items.map(item => ({
        name: item.name,
        amount: item.amount,
        description: item.description
      })),
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      payments: [],
      notificationsSent: {
        initial: false,
        reminder: false,
        overdue: false,
      },
    };

    const result = await createBill(params.id, billData);
    if (result.success) {
      // ส่งแจ้งเตือนผ่าน LINE
      const lineConfig = await getLineNotifyConfig(params.id);
      if (lineConfig.success && lineConfig.data) {
        await sendBillCreatedNotification(lineConfig.data, {
          ...billData,
          id: result.id!,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      toast.success("สร้างบิลเรียบร้อย");
      router.push(`/dormitories/${params.id}/bills`);
    }
  } catch (error) {
    console.error("Error creating bill:", error);
    toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
  } finally {
    setIsSubmitting(false);
  }
};

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { 
        name: "", 
        amount: 0,
        type: 'other',
        description: ''
      }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: "name" | "amount", value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === "amount" ? parseFloat(value as string) || 0 : value,
    };
    setFormData({
      ...formData,
      items: newItems,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <Link
            href={`/dormitories/${params.id}/bills`}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับ
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">สร้างบิลใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                เลือกห้อง <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                required
                className="mt-1"
              >
                <option value="">เลือกห้อง</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.number}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  เดือน <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.month}
                  onChange={(e) =>
                    setFormData({ ...formData, month: parseInt(e.target.value) })
                  }
                  required
                  className="mt-1"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ปี <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) })
                  }
                  required
                  className="mt-1"
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() + i
                  ).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  วันครบกำหนด <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">รายการ</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + เพิ่มรายการ
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4">
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      placeholder="ชื่อรายการ"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateItem(index, "amount", e.target.value)}
                      placeholder="จำนวนเงิน"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="text-right">
                <p className="text-lg font-medium text-gray-900">
                  รวมทั้งสิ้น:{" "}
                  {formData.items
                    .reduce((sum, item) => sum + item.amount, 0)
                    .toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                  บาท
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}