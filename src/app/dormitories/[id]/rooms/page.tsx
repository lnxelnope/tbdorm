"use client";

import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, ArrowLeft, Trash2 } from "lucide-react";
import { DormitoryConfig, Room, RoomType, Tenant } from "@/types/dormitory";
import Link from "next/link";
import { getRooms, getRoomTypes, getDormitory, queryTenants } from "@/lib/firebase/firebaseUtils";
import AddRoomModal from "@/components/rooms/AddRoomModal";
import EditRoomModal from "@/components/rooms/EditRoomModal";
import { toast } from "sonner";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { deleteRoom } from "@/lib/firebase/firebaseUtils";
import { calculateTotalPrice } from "./utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import RoomDetailsModal from "@/components/rooms/RoomDetailsModal";

interface SortConfig {
  key: 'number' | 'floor' | 'status' | 'roomType' | 'price';
  direction: 'asc' | 'desc';
}

interface Filters {
  floor: string;
  status: string;
  roomType: string;
  priceRange: {
    min: number;
    max: number;
  };
  additionalServices: string[];
}

interface DormitoryResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
    totalFloors: number;
    config?: {
      additionalFees?: {
        airConditioner?: number | null;
        parking?: number | null;
        floorRates?: {
          [key: string]: number | null;
        };
        utilities?: {
          water?: {
            perPerson?: number | null;
          };
          electric?: {
            unit?: number | null;
          };
        };
      };
    };
  };
}

function RoomsPageContent({ dormId }: { dormId: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [dormitoryName, setDormitoryName] = useState("");
  const [dormitoryConfig, setDormitoryConfig] = useState<DormitoryConfig>({
    roomTypes: {},
    additionalFees: {
      utilities: {
        water: { perPerson: null },
        electric: { unit: null }
      },
      items: [],
      floorRates: {}
    }
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'number',
    direction: 'asc'
  });

  const [filters, setFilters] = useState<Filters>({
    floor: "",
    status: "",
    roomType: "",
    priceRange: {
      min: 0,
      max: 100000,
    },
    additionalServices: []
  });

  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [dormitoryResult, setDormitoryResult] = useState<DormitoryResult | null>(null);
  const [isRoomDetailsModalOpen, setIsRoomDetailsModalOpen] = useState(false);

  const router = useRouter();

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (
        searchQuery &&
        !room.number.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      if (filters.floor && room.floor !== parseInt(filters.floor)) {
        return false;
      }

      if (filters.status && room.status !== filters.status) {
        return false;
      }

      if (filters.roomType && room.roomType !== filters.roomType) {
        return false;
      }

      if (filters.additionalServices.length > 0) {
        const hasAllServices = filters.additionalServices.every(serviceId => 
          room.additionalServices?.includes(serviceId)
        );
        if (!hasAllServices) {
          return false;
        }
      }

      const roomType = roomTypes.find((type) => type.id === room.roomType);
      if (roomType) {
        const totalPrice = calculateTotalPrice(room, roomTypes, dormitoryConfig);
        if (
          totalPrice < filters.priceRange.min ||
          totalPrice > filters.priceRange.max
        ) {
          return false;
        }
      }

      return true;
    });
  }, [rooms, searchQuery, filters]);

  const sortedAndFilteredRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'number':
          const roomA = parseInt(a.number.replace(/\D/g, '')) || 0;
          const roomB = parseInt(b.number.replace(/\D/g, '')) || 0;
          return (roomA - roomB) * direction;
        case 'floor':
          return (a.floor - b.floor) * direction;
        case 'status':
          return a.status.localeCompare(b.status) * direction;
        case 'roomType': {
          const typeNameA = roomTypes.find(t => t.id === a.roomType)?.name || '';
          const typeNameB = roomTypes.find(t => t.id === b.roomType)?.name || '';
          return typeNameA.localeCompare(typeNameB) * direction;
        }
        case 'price': {
          const priceA = calculateTotalPrice(a, roomTypes, dormitoryConfig);
          const priceB = calculateTotalPrice(b, roomTypes, dormitoryConfig);
          return (priceA - priceB) * direction;
        }
        default:
          return 0;
      }
    });
  }, [filteredRooms, sortConfig, roomTypes, dormitoryConfig]);

  // โหลดข้อมูลห้องพักและรูปแบบห้องพัก
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [roomsResult, roomTypesResult, dormResult, tenantsResult] =
          await Promise.all([
            getRooms(dormId),
            getRoomTypes(dormId),
            getDormitory(dormId),
            queryTenants(dormId),
          ]);

        if (roomsResult.success && roomsResult.data) {
          setRooms(roomsResult.data);
        }

        if (roomTypesResult.success && roomTypesResult.data) {
          setRoomTypes(roomTypesResult.data);
        }

        if (dormResult.success && dormResult.data) {
          // แปลง dormResult เป็น DormitoryResult type
          const formattedResult: DormitoryResult = {
            success: dormResult.success,
            data: {
              id: dormResult.data.id,
              name: dormResult.data.name,
              totalFloors: dormResult.data.totalFloors || 1,
              config: dormResult.data.config
            }
          };
          setDormitoryResult(formattedResult);
          setDormitoryName(dormResult.data.name);
          setDormitoryConfig({
            roomTypes: dormResult.data.config?.roomTypes || {},
            additionalFees: {
              utilities: {
                water: {
                  perPerson: dormResult.data.config?.additionalFees?.utilities?.water?.perPerson ?? null,
                },
                electric: {
                  unit: dormResult.data.config?.additionalFees?.utilities?.electric?.unit ?? null,
                },
              },
              items: dormResult.data.config?.additionalFees?.items || [],
              floorRates: dormResult.data.config?.additionalFees?.floorRates || {}
            },
          });
        }

        if (tenantsResult.success && tenantsResult.data) {
          setTenants(tenantsResult.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dormId]);

  // อัพเดท search query เมื่อ URL parameter เปลี่ยน
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const handleAddRoom = (newRoom: Room) => {
    setRooms((prevRooms) => [...prevRooms, newRoom]);
    router.refresh();
    setShowAddModal(false);
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsRoomDetailsModalOpen(false);
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms((prev) =>
      prev.map((room) => (room.id === updatedRoom.id ? updatedRoom : room))
    );
    setSelectedRoom(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบห้องนี้?")) {
      return;
    }

    try {
      const result = await deleteRoom(dormId, roomId);
      if (result.success) {
        setRooms((prev) => prev.filter((room) => room.id !== roomId));
        toast.success("ลบห้องพักเรียบร้อยแล้ว");
      } else {
        toast.error("เกิดข้อผิดพลาดในการลบห้องพัก");
      }
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("ไม่สามารถลบห้องพักได้");
    }
  };

  const getStatusColor = (status: Room["status"]) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "occupied":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: Room["status"]) => {
    switch (status) {
      case "available":
        return "ว่าง";
      case "occupied":
        return "มีผู้เช่า";
      case "maintenance":
        return "ปรับปรุง";
      default:
        return status;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRooms(sortedAndFilteredRooms.map(room => room.id));
    } else {
      setSelectedRooms([]);
    }
  };

  const handleSelectRoom = (roomId: string, checked: boolean) => {
    if (checked) {
      setSelectedRooms(prev => [...prev, roomId]);
    } else {
      setSelectedRooms(prev => prev.filter(id => id !== roomId));
    }
  };

  const handleDeleteSelectedRooms = async () => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบห้องที่เลือกทั้งหมด ${selectedRooms.length} ห้อง?`)) {
      return;
    }

    try {
      const results = await Promise.all(
        selectedRooms.map(roomId => deleteRoom(dormId, roomId))
      );

      const failedCount = results.filter(result => !result.success).length;
      
      if (failedCount > 0) {
        toast.error(`ไม่สามารถลบห้องได้ ${failedCount} ห้อง`);
      } else {
        toast.success(`ลบห้องพักเรียบร้อยแล้ว ${selectedRooms.length} ห้อง`);
        // อัพเดทรายการห้องพัก
        setRooms(prev => prev.filter(room => !selectedRooms.includes(room.id)));
        // รีเซ็ตรายการที่เลือก
        setSelectedRooms([]);
      }
    } catch (error) {
      console.error("Error deleting rooms:", error);
      toast.error("เกิดข้อผิดพลาดในการลบห้องพัก");
    }
  };

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setIsRoomDetailsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (roomTypes.length === 0) {
    return (
      <div className="p-6">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dormitories"
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              กลับ
            </Link>
          </div>
          <div className="bg-white rounded-lg p-8 text-center max-w-lg mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีรูปแบบห้องพัก</h3>
            <p className="text-sm text-gray-500 mb-6">
              คุณจำเป็นต้องเพิ่มรูปแบบห้องพักอย่างน้อย 1 รูปแบบก่อนที่จะสามารถเพิ่มห้องพักได้
            </p>
            <Link
              href={`/dormitories/${dormId}/config`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ไปที่หน้าตั้งค่าหอพัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">จัดการห้องพัก</h1>
        <p className="text-lg text-gray-600">หอพัก: {dormitoryName}</p>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dormitories"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            ย้อนกลับ
          </Link>
          <h1 className="text-2xl font-semibold">จัดการห้องพัก</h1>
        </div>
        <div className="flex gap-4">
          <Link
            href={`/dormitories/${dormId}/room-types`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            จัดการประเภทห้อง
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            เพิ่มห้องพัก
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="ค้นหาห้องพัก..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <select
                value={filters.floor}
                onChange={(e) => setFilters({ ...filters, floor: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">ทุกชั้น</option>
                {Array.from(new Set(rooms.map((room) => room.floor))).sort().map((floor) => (
                  <option key={floor} value={floor}>
                    ชั้น {floor}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">ทุกสถานะ</option>
                <option value="available">ว่าง</option>
                <option value="occupied">ไม่ว่าง</option>
                <option value="maintenance">ปิดปรับปรุง</option>
              </select>
              <select
                value={filters.roomType}
                onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">ทุกประเภท</option>
                {roomTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  เลขห้อง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชั้น
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ประเภทห้อง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จำนวนผู้อาศัย
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ค่าไฟ (ล่าสุด)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ค่าเช่าปัจจุบัน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ค้างจ่าย
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้เช่า
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAndFilteredRooms.map((room) => {
                const roomType = roomTypes.find((type) => type.id === room.roomType);
                const tenant = tenants.find((t) => t.roomNumber === room.number);

                return (
                  <tr key={room.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button
                        onClick={() => handleRoomClick(room)}
                        className="text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        {room.number.padStart(3, '0')}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {room.floor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {roomTypes.find(type => type.id === room.roomType)?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant?.numberOfResidents || '-'} คน
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dormitoryConfig?.additionalFees?.utilities?.electric?.unit ? 
                        `${dormitoryConfig.additionalFees.utilities.electric.unit} บาท/หน่วย` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <div className="text-gray-900">
                          <span className="font-medium">ค่าห้อง:</span> ฿{roomType?.basePrice?.toLocaleString() ?? 0}
                        </div>
                        {dormitoryConfig.additionalFees.floorRates[room.floor.toString()] && (
                          <div className={dormitoryConfig.additionalFees.floorRates[room.floor.toString()]! < 0 ? "text-red-500" : "text-green-600"}>
                            <span className="font-medium">ค่าชั้น {room.floor}:</span> {dormitoryConfig.additionalFees.floorRates[room.floor.toString()]! > 0 ? '+' : ''}฿{dormitoryConfig.additionalFees.floorRates[room.floor.toString()]?.toLocaleString()}
                          </div>
                        )}
                        {room.additionalServices?.map(serviceId => {
                          const service = dormitoryConfig?.additionalFees?.items?.find(item => item.id === serviceId);
                          return service && (
                            <div key={service.id} className="flex justify-between text-sm">
                              <span className="font-medium">{service.name}:</span> +฿{service.amount.toLocaleString()}
                            </div>
                          );
                        })}
                        {tenant && dormitoryConfig.additionalFees.utilities.water.perPerson && (
                          <div className="text-gray-900">
                            <span className="font-medium">ค่าน้ำ ({tenant.numberOfResidents} คน):</span> +฿{(dormitoryConfig.additionalFees.utilities.water.perPerson * tenant.numberOfResidents).toLocaleString()}
                          </div>
                        )}
                        <div className="border-t pt-1 mt-1 font-medium">
                          รวม: ฿{calculateTotalPrice(room, roomTypes, dormitoryConfig).toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant?.outstandingBalance?.toLocaleString() || '0'} บาท
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          room.status === "available"
                            ? "bg-green-100 text-green-800"
                            : room.status === "occupied"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {room.status === "available"
                          ? "ว่าง"
                          : room.status === "occupied"
                          ? "ไม่ว่าง"
                          : "ปิดปรับปรุง"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant?.name ?? "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditRoom(room)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddRoomModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          dormitoryId={dormId}
          roomTypes={roomTypes}
          onSuccess={handleAddRoom}
          totalFloors={dormitoryResult?.data?.totalFloors || 1}
        />
      )}

      {selectedRoom && !isRoomDetailsModalOpen && (
        <EditRoomModal
          room={selectedRoom}
          roomTypes={roomTypes}
          onClose={() => setSelectedRoom(null)}
          onSuccess={handleUpdateRoom}
          dormitoryId={dormId}
          totalFloors={dormitoryResult?.data?.totalFloors || 1}
        />
      )}

      {selectedRoom && isRoomDetailsModalOpen && (
        <RoomDetailsModal
          isOpen={isRoomDetailsModalOpen}
          onClose={() => {
            setIsRoomDetailsModalOpen(false);
            setSelectedRoom(null);
          }}
          dormitoryId={dormId}
          roomNumber={selectedRoom.number}
          roomTypes={roomTypes}
          config={dormitoryConfig}
          currentTenant={tenants.find(t => t.roomNumber === selectedRoom.number)}
        />
      )}
    </div>
  );
}

// เพิ่ม Server Component สำหรับ page
export default function RoomsPage({ params }: { params: { id: string } }) {
  return <RoomsPageContent dormId={params.id} />;
} 