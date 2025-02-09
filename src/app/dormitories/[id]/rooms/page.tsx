"use client";

import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, ArrowLeft, Trash2 } from "lucide-react";
import { Room, RoomType, Tenant } from "@/types/dormitory";
import Link from "next/link";
import { getRooms, getRoomTypes, getDormitory, queryTenants } from "@/lib/firebase/firebaseUtils";
import AddRoomModal from "./AddRoomModal";
import EditRoomModal from "./EditRoomModal";
import { toast } from "sonner";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { deleteRoom } from "@/lib/firebase/firebaseUtils";
import { calculateTotalPrice } from "./utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface DormitoryConfig {
  additionalFees: {
    airConditioner: number | null;
    parking: number | null;
    floorRates: {
      [key: string]: number | null;
    };
    utilities: {
      water: {
        perPerson: number | null;
      };
      electric: {
        unit: number | null;
      };
    };
  };
}

interface SortConfig {
  key: 'number' | 'floor' | 'status' | 'roomType' | 'price';
  direction: 'asc' | 'desc';
}

interface Filters {
  floor: string;
  status: string;
  roomType: string;
  hasAirConditioner: boolean;
  hasParking: boolean;
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
    additionalFees: {
      airConditioner: null,
      parking: null,
      floorRates: {},
      utilities: {
        water: { perPerson: null },
        electric: { unit: null }
      }
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
    hasAirConditioner: false,
    hasParking: false,
  });

  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [dormitoryResult, setDormitoryResult] = useState<DormitoryResult | null>(null);

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

      if (filters.hasAirConditioner && !room.hasAirConditioner) {
        return false;
      }

      if (filters.hasParking && !room.hasParking) {
        return false;
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
            additionalFees: {
              airConditioner: dormResult.data.config?.additionalFees?.airConditioner ?? null,
              parking: dormResult.data.config?.additionalFees?.parking ?? null,
              floorRates: dormResult.data.config?.additionalFees?.floorRates || {},
              utilities: {
                water: {
                  perPerson: dormResult.data.config?.additionalFees?.utilities?.water?.perPerson ?? null,
                },
                electric: {
                  unit: dormResult.data.config?.additionalFees?.utilities?.electric?.unit ?? null,
                },
              },
            },
          });
        }

        if (tenantsResult.success && tenantsResult.data) {
          setTenants(tenantsResult.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
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

  const handleEditRoom = (updatedRoom: Room) => {
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
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link
            href="/dormitories"
            className="text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">จัดการห้องพัก</h1>
            {dormitoryResult?.data?.name && (
              <p className="text-sm text-gray-500">{dormitoryResult.data.name}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-medium rounded-md shadow-sm text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มห้องพัก
        </button>
      </div>

      {/* ค้นหาและตัวกรอง */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาห้องพัก..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-gray-200 focus:border-gray-200 sm:text-sm"
          />
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <input
                type="radio"
                id="allFloors"
                name="floor"
                value=""
                checked={filters.floor === ""}
                onChange={(e) =>
                  setFilters({ ...filters, floor: e.target.value })
                }
                className="h-4 w-4 text-gray-600 focus:ring-gray-200 border-gray-300"
              />
              <label htmlFor="allFloors" className="ml-2 block text-sm text-gray-700">
                ทุกชั้น
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="floor1"
                name="floor"
                value="1"
                checked={filters.floor === "1"}
                onChange={(e) =>
                  setFilters({ ...filters, floor: e.target.value })
                }
                className="h-4 w-4 text-gray-600 focus:ring-gray-200 border-gray-300"
              />
              <label htmlFor="floor1" className="ml-2 block text-sm text-gray-700">
                ชั้น 1
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="floor2"
                name="floor"
                value="2"
                checked={filters.floor === "2"}
                onChange={(e) =>
                  setFilters({ ...filters, floor: e.target.value })
                }
                className="h-4 w-4 text-gray-600 focus:ring-gray-200 border-gray-300"
              />
              <label htmlFor="floor2" className="ml-2 block text-sm text-gray-700">
                ชั้น 2
              </label>
            </div>
          </div>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-200 focus:border-gray-200 sm:text-sm rounded-md"
          >
            <option value="">ทุกสถานะ</option>
            <option value="available">ว่าง</option>
            <option value="occupied">มีผู้เช่า</option>
            <option value="maintenance">ปรับปรุง</option>
          </select>
          <select
            value={filters.roomType}
            onChange={(e) =>
              setFilters({ ...filters, roomType: e.target.value })
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-200 focus:ring-gray-200 sm:text-sm"
          >
            <option value="">ทุกรูปแบบ</option>
            {Array.isArray(roomTypes) && roomTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* รายการห้องพัก */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              เลือกแล้ว {selectedRooms.length} ห้อง
            </div>
            {selectedRooms.length === sortedAndFilteredRooms.length && selectedRooms.length > 0 && (
              <button
                onClick={handleDeleteSelectedRooms}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                ลบห้องที่เลือก
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedRooms.length === sortedAndFilteredRooms.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-gray-600 focus:ring-gray-200 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('number')}>
                  <div className="flex items-center gap-1">
                    เลขห้อง
                    {sortConfig.key === 'number' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('floor')}>
                  <div className="flex items-center gap-1">
                    ชั้น
                    {sortConfig.key === 'floor' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('roomType')}>
                  <div className="flex items-center gap-1">
                    รูปแบบห้อง
                    {sortConfig.key === 'roomType' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1">
                    ราคารวม/เดือน
                    {sortConfig.key === 'price' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รายละเอียดค่าใช้จ่าย
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    สถานะ
                    {sortConfig.key === 'status' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สิ่งอำนวยความสะดวก
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้เช่าปัจจุบัน
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAndFilteredRooms.map((room) => {
                const roomType = roomTypes.find((type) => type.id === room.roomType);
                const currentTenant = tenants.find(t => t.roomNumber === room.number);
                return (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(room.id)}
                        onChange={(e) => handleSelectRoom(room.id, e.target.checked)}
                        className="h-4 w-4 text-gray-600 focus:ring-gray-200 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dormitories/${dormId}/rooms/${room.number}`}
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors duration-200"
                      >
                        {room.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">ชั้น {room.floor}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{roomType?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ฿{calculateTotalPrice(room, roomTypes, dormitoryConfig).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <div className="text-gray-900">
                          <span className="font-medium">ค่าห้อง:</span> ฿{roomType?.price?.toLocaleString() ?? 0}
                        </div>
                        {dormitoryConfig.additionalFees.floorRates[room.floor.toString()] && (
                          <div className={dormitoryConfig.additionalFees.floorRates[room.floor.toString()]! < 0 ? "text-red-500" : "text-green-600"}>
                            <span className="font-medium">ชั้น {room.floor}:</span> {dormitoryConfig.additionalFees.floorRates[room.floor.toString()]! < 0 ? "-" : "+"}
                            ฿{Math.abs(dormitoryConfig.additionalFees.floorRates[room.floor.toString()]!).toLocaleString()}
                          </div>
                        )}
                        {room.hasAirConditioner && dormitoryConfig.additionalFees.airConditioner && (
                          <div className="text-green-600">
                            <span className="font-medium">ค่าแอร์:</span> +฿{dormitoryConfig.additionalFees.airConditioner.toLocaleString()}
                          </div>
                        )}
                        {room.hasParking && dormitoryConfig.additionalFees.parking && (
                          <div className="text-purple-600">
                            <span className="font-medium">ที่จอดรถ:</span> +฿{dormitoryConfig.additionalFees.parking.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(room.status)}`}>
                        {getStatusText(room.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        {room.hasAirConditioner && (
                          <span className="inline-flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            แอร์
                          </span>
                        )}
                        {room.hasParking && (
                          <span className="inline-flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            ที่จอดรถ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {room.status === 'occupied' && currentTenant ? (
                        <Link 
                          href={`/tenants?search=${currentTenant.name}`}
                          className="text-gray-900 hover:text-gray-900 hover:underline"
                        >
                          {currentTenant.name}
                        </Link>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => setSelectedRoom(room)}
                        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="text-red-600 hover:text-red-800 hover:underline transition-colors duration-200"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
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

      {selectedRoom && (
        <EditRoomModal
          room={selectedRoom}
          roomTypes={roomTypes}
          onClose={() => setSelectedRoom(null)}
          onSuccess={handleEditRoom}
          dormitoryId={dormId}
          totalFloors={dormitoryResult?.data?.totalFloors || 1}
        />
      )}
    </div>
  );
}

// เพิ่ม Server Component สำหรับ page
export default function RoomsPage({ params }: { params: { id: string } }) {
  return <RoomsPageContent dormId={params.id} />;
} 