"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { getRooms, getRoomTypes, getDormitory, queryTenants, updateRoom } from "@/lib/firebase/firebaseUtils";
import { Room, RoomType, Tenant } from "@/types/dormitory";
import { toast } from "sonner";
import { calculateTotalPrice } from "../utils";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

interface DormitoryConfig {
  additionalFees: {
    utilities: {
      water: {
        perPerson: number | null;
      };
      electric: {
        unit: number | null;
      };
    };
    items: {
      id: string;
      name: string;
      amount: number;
    }[];
    floorRates: {
      [key: string]: number | null;
    };
  };
}

interface FormData {
  number: string;
  floor: number;
  roomType: string;
  status: Room['status'];
  initialMeterReading: number;
  additionalServices: string[];
}

// Modal Component
function EditRoomModal({ 
  isOpen, 
  onClose, 
  room, 
  roomTypes, 
  dormId,
  totalFloors,
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  room: Room; 
  roomTypes: RoomType[]; 
  dormId: string;
  totalFloors: number;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    number: room.number,
    floor: room.floor,
    roomType: room.roomType,
    status: room.status,
    initialMeterReading: room.initialMeterReading || 0,
    additionalServices: room.additionalServices || []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.number.trim()) {
      toast.error("กรุณากรอกเลขห้อง");
      return;
    }

    if (!formData.roomType) {
      toast.error("กรุณาเลือกรูปแบบห้อง");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await updateRoom(dormId, room.id, {
        ...formData,
        number: formData.number.trim(),
      });

      if (result.success) {
        toast.success("แก้ไขห้องพักเรียบร้อย");
        onSuccess();
        onClose();
      } else {
        toast.error("ไม่สามารถแก้ไขห้องพักได้");
      }
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error("เกิดข้อผิดพลาดในการแก้ไขห้องพัก");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">แก้ไขข้อมูลห้องพัก</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              เลขห้อง <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.number}
              onChange={(e) =>
                setFormData({ ...formData, number: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ชั้น <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: totalFloors }, (_, i) => i + 1).map((floor) => (
                <label
                  key={floor}
                  className="relative flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="floor"
                    required
                    value={floor}
                    checked={formData.floor === floor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        floor: parseInt(e.target.value),
                      })
                    }
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    ชั้น {floor}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              รูปแบบห้อง <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.roomType}
              onChange={(e) =>
                setFormData({ ...formData, roomType: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">เลือกรูปแบบห้อง</option>
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} - {type.basePrice.toLocaleString()} บาท/เดือน
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              สถานะ <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as Room["status"],
                })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="available">ว่าง</option>
              <option value="occupied">มีผู้เช่า</option>
              <option value="maintenance">ปรับปรุง</option>
            </select>
          </div>

          <div className="space-y-2">
            {room.additionalServices?.map(serviceId => {
              const service = dormitoryConfig?.additionalFees?.items?.find(item => item.id === serviceId);
              return service && (
                <span key={service.id} className="inline-flex items-center">
                  <span className="ml-2">{service.name}</span>
                </span>
              );
            })}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RoomDetailsPage() {
  const params = useParams();
  const dormId = params.id as string;
  const roomNumber = params.roomNumber as string;
  const [isLoading, setIsLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [dormitoryName, setDormitoryName] = useState("");
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [totalFloors, setTotalFloors] = useState(1);
  const [dormitoryConfig, setDormitoryConfig] = useState<DormitoryConfig>({
    additionalFees: {
      utilities: {
        water: {
          perPerson: null
        },
        electric: {
          unit: null
        }
      },
      items: [],
      floorRates: {}
    }
  });
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [roomResult, roomTypesResult, dormitoryResult, tenantsResult] = await Promise.all([
        getRooms(dormId),
        getRoomTypes(dormId),
        getDormitory(dormId),
        queryTenants(dormId)
      ]);

      if (roomResult.success && roomResult.data) {
        const foundRoom = roomResult.data.find(r => r.number === roomNumber);
        if (foundRoom) {
          setRoom(foundRoom);
        }
      }

      if (roomTypesResult.success && roomTypesResult.data) {
        setRoomTypes(roomTypesResult.data);
        const foundRoomType = roomTypesResult.data.find(t => t.id === room?.roomType);
        if (foundRoomType) {
          setRoomType(foundRoomType);
        }
      }

      if (dormitoryResult.success && dormitoryResult.data) {
        setDormitoryName(dormitoryResult.data.name);
        setTotalFloors(dormitoryResult.data.totalFloors || 1);
        setDormitoryConfig({
          additionalFees: {
            utilities: {
              water: {
                perPerson: dormitoryResult.data.config?.additionalFees?.utilities?.water?.perPerson ?? null
              },
              electric: {
                unit: dormitoryResult.data.config?.additionalFees?.utilities?.electric?.unit ?? null
              }
            },
            items: dormitoryResult.data.config?.additionalFees?.items || [],
            floorRates: dormitoryResult.data.config?.additionalFees?.floorRates || {}
          }
        });
      }

      if (tenantsResult.success && tenantsResult.data) {
        const foundTenant = tenantsResult.data.find(t => t.roomNumber === roomNumber);
        if (foundTenant) {
          setCurrentTenant(foundTenant);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  }, [dormId, roomNumber, room?.roomType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบข้อมูลห้องพัก</h3>
          <Link
            href={`/dormitories/${dormId}/rooms`}
            className="text-blue-600 hover:text-blue-900"
          >
            กลับไปหน้ารายการห้องพัก
          </Link>
        </div>
      </div>
    );
  }

  const totalRent = roomType ? calculateTotalPrice(room, [roomType], dormitoryConfig) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link
          href={`/dormitories/${dormId}/rooms`}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          กลับ
        </Link>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150"
        >
          <Edit className="w-4 h-4 mr-1" />
          แก้ไข
        </button>
      </div>
        <h1 className="text-xl font-semibold text-gray-900">
          {dormitoryName} - ห้อง {room.number}
        </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ข้อมูลห้องพัก */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลห้องพัก</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">เลขห้อง</dt>
              <dd className="mt-1 text-sm text-gray-900">ห้อง {room.number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">ชั้น</dt>
              <dd className="mt-1 text-sm text-gray-900">ชั้น {room.floor}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">รูปแบบห้อง</dt>
              <dd className="mt-1 text-sm text-gray-900">{roomType?.name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">สถานะ</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${room.status === 'available' ? 'bg-green-100 text-green-800' : 
                    room.status === 'occupied' ? 'bg-blue-100 text-blue-800' : 
                    'bg-yellow-100 text-yellow-800'}`}
                >
                  {room.status === 'available' ? 'ว่าง' : 
                   room.status === 'occupied' ? 'มีผู้เช่า' : 
                   'ปรับปรุง'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">สิ่งอำนวยความสะดวก</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="flex gap-2">
                  {room.additionalServices?.map(serviceId => {
                    const service = dormitoryConfig?.additionalFees?.items?.find(item => item.id === serviceId);
                    return service && (
                      <span key={service.id} className="inline-flex items-center">
                        <span className="ml-2">{service.name}</span>
                      </span>
                    );
                  })}
                </div>
              </dd>
            </div>
          </dl>
        </div>

        {/* ข้อมูลค่าใช้จ่าย */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">ค่าใช้จ่าย</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">ค่าเช่ารวม/เดือน</dt>
              <dd className="mt-1 text-lg font-semibold text-blue-600">฿{totalRent.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">รายละเอียดค่าใช้จ่าย</dt>
              <dd className="mt-1 space-y-2">
                <div className="text-sm text-gray-900">
                  <span className="font-medium">ค่าห้อง:</span> ฿{roomType?.basePrice.toLocaleString() || 0}
                </div>
                {dormitoryConfig.additionalFees.floorRates[room.floor.toString()] && (
                  <div className={dormitoryConfig.additionalFees.floorRates[room.floor.toString()]! < 0 ? "text-sm text-red-500" : "text-sm text-green-600"}>
                    <span className="font-medium">ชั้น {room.floor}:</span> {dormitoryConfig.additionalFees.floorRates[room.floor.toString()]! < 0 ? "-" : "+"}
                    ฿{Math.abs(dormitoryConfig.additionalFees.floorRates[room.floor.toString()]!).toLocaleString()}
                  </div>
                )}
                {room.additionalServices?.map(serviceId => {
                  const service = dormitoryConfig.additionalFees.items.find(item => item.id === serviceId);
                  if (service) {
                    return (
                      <div key={service.id} className="text-sm text-green-600">
                        <span className="font-medium">{service.name}:</span> +฿{service.amount.toLocaleString()}
                      </div>
                    );
                  }
                  return null;
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* ข้อมูลผู้เช่าปัจจุบัน */}
        {currentTenant ? (
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลผู้เช่าปัจจุบัน</h2>
              <Link
                href={`/tenants?search=${encodeURIComponent(currentTenant.name)}`}
                className="text-sm text-blue-600 hover:text-blue-900 hover:underline"
              >
                ดูข้อมูลเพิ่มเติม
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">ชื่อ-นามสกุล</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link
                      href={`/tenants?search=${encodeURIComponent(currentTenant.name)}`}
                      className="text-blue-600 hover:text-blue-900 hover:underline"
                    >
                      {currentTenant.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentTenant.phone}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Line ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentTenant.lineId}</dd>
                </div>
              </dl>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">วันที่เข้าพัก</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(currentTenant.startDate).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">จำนวนผู้พักอาศัย</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentTenant.numberOfResidents} คน</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">เงินประกัน</dt>
                  <dd className="mt-1 text-sm text-gray-900">฿{currentTenant.deposit.toLocaleString()}</dd>
                </div>
              </dl>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">ค่าเช่าค้างชำระ</dt>
                  <dd className="mt-1 text-sm font-medium text-red-600">
                    {/* TODO: คำนวณค่าเช่าค้างชำระ */}
                    ฿0
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">จำนวนเดือนที่ค้าง</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {/* TODO: คำนวณจำนวนเดือนที่ค้าง */}
                    0 เดือน
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <div className="text-center py-4">
              <p className="text-gray-500">ยังไม่มีผู้เช่า</p>
            </div>
          </div>
        )}
      </div>

      {room && (
        <EditRoomModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          room={room}
          roomTypes={roomTypes}
          dormId={dormId}
          totalFloors={totalFloors}
          onSuccess={() => {
            if (dormId && roomNumber) {
              loadData();
            }
          }}
        />
      )}
    </div>
  );
} 