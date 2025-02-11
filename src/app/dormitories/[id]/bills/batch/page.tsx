"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DormitoryConfig, Room, RoomType, Tenant } from "@/types/dormitory";
import {
  getRooms,
  getRoomTypes,
  queryTenants as getTenants,
  createBill,
  getUtilityReadings,
  getDormitoryConfig,
  getDormitory,
} from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BillItem {
  name: string;
  type: string;
  amount: number;
}

interface RoomWithTenant extends Room {
  currentTenant?: {
    id: string;
    name: string;
  } | null;
}

interface DormitoryConfigState {
  roomRate: number;
  waterRate: number;
  electricityRate: number;
  additionalFees: {
    items: Array<{
      id: string;
      name: string;
      amount: number;
    }>;
    floorRates: {
      [key: string]: number;
    };
  };
}

export default function BatchCreateBillPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rooms, setRooms] = useState<RoomWithTenant[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<RoomWithTenant[]>([]);
  const [dormitoryConfig, setDormitoryConfig] = useState<DormitoryConfigState | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [dueDate, setDueDate] = useState(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      10
    ).toISOString().split("T")[0]
  );

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [roomsResult, tenantsResult, roomTypesResult] = await Promise.all([
        getRooms(params.id),
        getTenants(params.id),
        getRoomTypes(params.id)
      ]);

      if (roomsResult.success && tenantsResult.success && roomTypesResult.success &&
          roomsResult.data && tenantsResult.data && roomTypesResult.data) {
        const roomsWithTenants: RoomWithTenant[] = roomsResult.data.map((room: Room) => {
          const tenant = tenantsResult.data?.find((t: Tenant) => t.roomNumber === room.number);
          return {
            ...room,
            currentTenant: tenant ? {
              id: tenant.id,
              name: tenant.name
            } : null
          };
        });

        setRooms(roomsWithTenants);
        setSelectedRooms(roomsWithTenants.filter((room: RoomWithTenant) => room.status === "occupied"));
        setRoomTypes(roomTypesResult.data);
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

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const result = await getDormitory(params.id);
        if (result.success && result.data?.config?.additionalFees) {
          const formattedConfig: DormitoryConfigState = {
            roomRate: result.data.config.additionalFees.utilities?.water?.perPerson || 0,
            waterRate: result.data.config.additionalFees.utilities?.water?.perPerson || 0,
            electricityRate: result.data.config.additionalFees.utilities?.electric?.unit || 0,
            additionalFees: {
              items: result.data.config.additionalFees.items || [],
              floorRates: result.data.config.additionalFees.floorRates || {}
            }
          };
          setDormitoryConfig(formattedConfig);
        }
      } catch (error) {
        console.error("Error fetching config:", error);
        toast.error("ไม่สามารถโหลดข้อมูลการตั้งค่าได้");
      }
    };
    fetchConfig();
  }, [params.id]);

  const handleSelectAllRooms = (checked: boolean) => {
    if (checked) {
      setSelectedRooms(rooms);
    } else {
      setSelectedRooms([]);
    }
  };

  const handleSelectRoom = (room: Room, checked: boolean) => {
    if (checked) {
      setSelectedRooms(prev => [...prev, room]);
    } else {
      setSelectedRooms(prev => prev.filter(r => r.id !== room.id));
    }
  };

  const generateBillItems = (room: Room, roomType: RoomType, config: DormitoryConfigState): BillItem[] => {
    const items: BillItem[] = [];

    // Add room rent
    items.push({
      name: "ค่าเช่าห้อง",
      type: "rent",
      amount: roomType.basePrice
    });

    // Add floor rate if applicable
    const floorRates = config.additionalFees?.floorRates;
    if (floorRates && floorRates[room.floor]) {
      items.push({
        name: `ค่าชั้น ${room.floor}`,
        type: "floor_rate", 
        amount: floorRates[room.floor]
      });
    }

    // Add additional fees based on services
    if (room.additionalServices && room.additionalServices.length > 0 && config.additionalFees?.items) {
      room.additionalServices.forEach(serviceId => {
        const service = config.additionalFees.items.find(item => item.id === serviceId);
        if (service) {
          items.push({
            name: service.name,
            type: "additional_fee",
            amount: service.amount
          });
        }
      });
    }

    return items;
  };

  const calculateRoomTotal = (room: Room) => {
    const roomType = roomTypes.find(type => type.id === room.roomType);
    if (!roomType || !dormitoryConfig) return 0;

    return generateBillItems(room, roomType, dormitoryConfig).reduce((sum, item) => sum + item.amount, 0);
  };

  const handleGenerateBills = async () => {
    try {
      if (!dormitoryConfig) {
        toast.error("กรุณารอโหลดข้อมูลการตั้งค่า");
        return;
      }

      setIsLoading(true);

      const billsToCreate = selectedRooms.map(room => {
        const roomType = roomTypes.find(type => type.id === room.roomType);
        if (!roomType) return null;

        const billItems = generateBillItems(room, roomType, dormitoryConfig);
        const totalAmount = billItems.reduce((sum, item) => sum + item.amount, 0);

        const now = new Date().toISOString();

        return {
          roomId: room.id,
          roomNumber: room.number,
          tenantId: room.currentTenant?.id || null,
          items: billItems,
          totalAmount,
          status: "pending" as const,
          dueDate: dueDate,
          createdAt: now,
          updatedAt: now
        };
      }).filter((bill): bill is NonNullable<typeof bill> => bill !== null);

      let successCount = 0;
      let errorCount = 0;

      for (const bill of billsToCreate) {
        const result = await createBill(params.id, bill);
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
      console.error("Error generating bills:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRooms.length === 0) {
      toast.error("กรุณาเลือกห้องที่ต้องการสร้างบิล");
      return;
    }

    try {
      setIsProcessing(true);
      await handleGenerateBills();
    } catch (error) {
      console.error("Error creating bills:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
    } finally {
      setIsProcessing(false);
    }
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
                กำหนดชำระ
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
                          checked={selectedRooms.includes(room)}
                          onChange={(e) =>
                            handleSelectRoom(room, e.target.checked)
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
                        ฿{calculateRoomTotal(room).toLocaleString()}
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