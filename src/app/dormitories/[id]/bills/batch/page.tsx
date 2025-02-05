"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Room, RoomType, Tenant, Bill, BillItem } from "@/types/dormitory";
import {
  getRooms,
  getRoomTypes,
  queryTenants,
  createBill,
  getUtilityReadings,
} from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function BatchCreateBillPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [utilityReadings, setUtilityReadings] = useState<any[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    dueDate: new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      10
    ).toISOString().split("T")[0],
  });

  useEffect(() => {
    loadInitialData();
  }, [params.id]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [roomsResult, roomTypesResult, tenantsResult] = await Promise.all([
        getRooms(params.id),
        getRoomTypes(params.id),
        queryTenants(params.id),
      ]);

      if (roomsResult.success && roomsResult.data) {
        setRooms(roomsResult.data);
        // เลือกห้องที่มีผู้เช่าทั้งหมดเป็นค่าเริ่มต้น
        setSelectedRooms(
          roomsResult.data
            .filter((room) => room.status === "occupied")
            .map((room) => room.id)
        );
      }
      if (roomTypesResult.success && roomTypesResult.data) {
        setRoomTypes(roomTypesResult.data);
      }
      if (tenantsResult.success && tenantsResult.data) {
        setTenants(tenantsResult.data);
      }

      // โหลดข้อมูลมิเตอร์ทั้งหมด
      const readingsResult = await getUtilityReadings(params.id);
      if (readingsResult.success && readingsResult.data) {
        setUtilityReadings(readingsResult.data);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAllRooms = (checked: boolean) => {
    if (checked) {
      setSelectedRooms(
        rooms.filter((room) => room.status === "occupied").map((room) => room.id)
      );
    } else {
      setSelectedRooms([]);
    }
  };

  const handleSelectRoom = (roomId: string, checked: boolean) => {
    if (checked) {
      setSelectedRooms([...selectedRooms, roomId]);
    } else {
      setSelectedRooms(selectedRooms.filter((id) => id !== roomId));
    }
  };

  const calculateBillItems = (room: Room): BillItem[] => {
    const items: BillItem[] = [];
    const roomType = roomTypes.find((type) => type.id === room.roomType);
    if (!roomType) return items;

    // เพิ่มค่าเช่าห้อง
    items.push({
      type: "rent",
      description: "ค่าเช่าห้องพัก",
      amount: roomType.basePrice,
    });

    // เพิ่มค่าแอร์ (ถ้ามี)
    if (room.hasAirConditioner && roomType.airConditionerFee) {
      items.push({
        type: "air_conditioner",
        description: "ค่าบริการเครื่องปรับอากาศ",
        amount: roomType.airConditionerFee,
      });
    }

    // เพิ่มค่าที่จอดรถ (ถ้ามี)
    if (room.hasParking && roomType.parkingFee) {
      items.push({
        type: "parking",
        description: "ค่าที่จอดรถ",
        amount: roomType.parkingFee,
      });
    }

    // เพิ่มค่าน้ำ/ไฟ (ถ้ามีข้อมูลมิเตอร์)
    const waterReading = utilityReadings.find(
      (r) => r.type === "water" && r.roomId === room.id
    );
    const electricReading = utilityReadings.find(
      (r) => r.type === "electric" && r.roomId === room.id
    );

    if (waterReading) {
      items.push({
        type: "water",
        description: "ค่าน้ำประปา",
        amount: waterReading.units * 18,
        quantity: waterReading.units,
        unitPrice: 18,
        utilityReading: {
          previous: waterReading.previousReading,
          current: waterReading.currentReading,
          units: waterReading.units,
        },
      });
    }

    if (electricReading) {
      items.push({
        type: "electric",
        description: "ค่าไฟฟ้า",
        amount: electricReading.units * 7,
        quantity: electricReading.units,
        unitPrice: 7,
        utilityReading: {
          previous: electricReading.previousReading,
          current: electricReading.currentReading,
          units: electricReading.units,
        },
      });
    }

    return items;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRooms.length === 0) {
      toast.error("กรุณาเลือกห้องที่ต้องการสร้างบิล");
      return;
    }

    try {
      setIsProcessing(true);
      let successCount = 0;
      let errorCount = 0;

      for (const roomId of selectedRooms) {
        const room = rooms.find((r) => r.id === roomId);
        const tenant = tenants.find((t) => t.roomNumber === room?.number);
        if (!room || !tenant) {
          errorCount++;
          continue;
        }

        const items = calculateBillItems(room);
        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

        const billData: Omit<Bill, "id" | "createdAt" | "updatedAt"> = {
          dormitoryId: params.id,
          roomId: room.number,
          tenantId: tenant.id,
          month: formData.month,
          year: formData.year,
          dueDate: new Date(formData.dueDate),
          status: "pending",
          items,
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
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `สร้างบิลสำเร็จ ${successCount} ห้อง${
            errorCount > 0 ? ` (ล้มเหลว ${errorCount} ห้อง)` : ""
          }`
        );
        router.push(`/dormitories/${params.id}/bills`);
      } else {
        toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
      }
    } catch (error) {
      console.error("Error creating bills:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotal = (room: Room) => {
    return calculateBillItems(room).reduce((sum, item) => sum + item.amount, 0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link
          href={`/dormitories/${params.id}/bills`}
          className="text-gray-500 hover:text-gray-700 mr-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          สร้างบิลประจำเดือน
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เดือน
              </label>
              <select
                value={formData.month}
                onChange={(e) =>
                  setFormData({ ...formData, month: parseInt(e.target.value) })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString("th-TH", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ปี
              </label>
              <select
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              >
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() - 2 + i
                ).map((year) => (
                  <option key={year} value={year}>
                    {year + 543}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                กำหนดชำระ
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">เลือกห้อง</h2>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    selectedRooms.length ===
                    rooms.filter((room) => room.status === "occupied").length
                  }
                  onChange={(e) => handleSelectAllRooms(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">เลือกทั้งหมด</span>
              </label>
            </div>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <span className="sr-only">เลือก</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ห้อง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้เช่า
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รูปแบบห้อง
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ยอดรวม
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rooms
                .filter((room) => room.status === "occupied")
                .map((room) => {
                  const tenant = tenants.find(
                    (t) => t.roomNumber === room.number
                  );
                  const roomType = roomTypes.find(
                    (type) => type.id === room.roomType
                  );
                  return (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRooms.includes(room.id)}
                          onChange={(e) =>
                            handleSelectRoom(room.id, e.target.checked)
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ห้อง {room.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenant?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {roomType?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ฿{calculateTotal(room).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <Link
            href={`/dormitories/${params.id}/bills`}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-4"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isProcessing}
            className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isProcessing ? "กำลังสร้างบิล..." : "สร้างบิล"}
          </button>
        </div>
      </form>
    </div>
  );
} 