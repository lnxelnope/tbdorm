"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { getRooms, getRoomTypes, getDormitory, queryTenants, updateRoom } from "@/lib/firebase/firebaseUtils";
import { Room, RoomType, DormitoryConfig } from "@/types/dormitory";
import { Tenant } from "@/types/tenant";
import { toast } from "sonner";
import { calculateTotalPrice } from "@/app/dormitories/[id]/rooms/utils";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

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
  onSuccess,
  dormitoryConfig 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  room: Room; 
  roomTypes: RoomType[]; 
  dormId: string;
  totalFloors: number;
  onSuccess: () => void;
  dormitoryConfig: DormitoryConfig;
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
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // โหลดข้อมูลหอพัก
      const dormitoryResult = await getDormitory(dormId);
      if (dormitoryResult.success && dormitoryResult.data) {
        setDormitoryName(dormitoryResult.data.name);
        setTotalFloors(dormitoryResult.data.totalFloors || 1);
        if (dormitoryResult.data.config) {
          setDormitoryConfig(dormitoryResult.data.config);
        }
      }

      // โหลดข้อมูลห้องพัก
      const roomsResult = await getRooms(dormId);
      if (roomsResult.success && roomsResult.data) {
        const foundRoom = roomsResult.data.find(r => r.number === roomNumber);
        if (foundRoom) {
          setRoom(foundRoom);
        }
      }

      // โหลดข้อมูลประเภทห้อง
      const roomTypesResult = await getRoomTypes(dormId);
      if (roomTypesResult.success && roomTypesResult.data) {
        setRoomTypes(roomTypesResult.data);
        if (room) {
          const foundRoomType = roomTypesResult.data.find(rt => rt.id === room.roomType);
          if (foundRoomType) {
            setRoomType(foundRoomType);
          }
        }
      }

      // โหลดข้อมูลผู้เช่า
      const tenantsResult = await queryTenants(dormId);
      if (tenantsResult.success && tenantsResult.data) {
        const foundTenant = tenantsResult.data.find(t => t.roomNumber === roomNumber);
        if (foundTenant) {
          setCurrentTenant(foundTenant);
        }
      }
    } catch (error) {
      console.error("Error loading room details:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  }, [dormId, roomNumber, room]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditSuccess = () => {
    loadData();
    setIsEditModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">กำลังโหลด...</div>
      </div>
    );
  }

  if (!room || !roomType) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">ไม่พบข้อมูลห้องพัก</div>
      </div>
    );
  }

  const priceDetails = calculateTotalPrice(room, dormitoryConfig, currentTenant);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link
            href={`/dormitories/${dormId}/rooms`}
            className="text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              ห้อง {room.number}
            </h1>
            <p className="text-sm text-gray-500">{dormitoryName}</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Edit className="w-4 h-4 mr-2" />
          แก้ไข
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">ข้อมูลห้องพัก</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">ประเภทห้อง</dt>
              <dd className="mt-1 text-sm text-gray-900">{roomType.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">ชั้น</dt>
              <dd className="mt-1 text-sm text-gray-900">{room.floor}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">สถานะ</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {room.status === "available"
                  ? "ว่าง"
                  : room.status === "occupied"
                  ? "มีผู้เช่า"
                  : "ปรับปรุง"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">ค่าเช่ารวม/เดือน</dt>
              <dd className="mt-1 text-lg font-semibold text-blue-600">
                ฿{priceDetails.total.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        {currentTenant && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">ข้อมูลผู้เช่า</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">ชื่อ-นามสกุล</dt>
                <dd className="mt-1 text-sm text-gray-900">{currentTenant.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {currentTenant.phone || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Line ID</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {currentTenant.lineId || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">วันที่เข้าอยู่</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {currentTenant.startDate
                    ? new Date(currentTenant.startDate).toLocaleDateString("th-TH")
                    : "-"}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">รายละเอียดค่าใช้จ่าย</h2>
          <dl className="mt-4 space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">ค่าห้องพื้นฐาน</dt>
              <dd className="text-sm text-gray-900">
                ฿{priceDetails.breakdown.basePrice.toLocaleString()}
              </dd>
            </div>
            {priceDetails.breakdown.floorRate > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">ค่าชั้น</dt>
                <dd className="text-sm text-gray-900">
                  ฿{priceDetails.breakdown.floorRate.toLocaleString()}
                </dd>
              </div>
            )}
            {priceDetails.breakdown.additionalServices > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">ค่าบริการเพิ่มเติม</dt>
                <dd className="text-sm text-gray-900">
                  ฿{priceDetails.breakdown.additionalServices.toLocaleString()}
                </dd>
              </div>
            )}
            {priceDetails.breakdown.water > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">ค่าน้ำ</dt>
                <dd className="text-sm text-gray-900">
                  ฿{priceDetails.breakdown.water.toLocaleString()}
                </dd>
              </div>
            )}
            {priceDetails.breakdown.electricity > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">ค่าไฟ</dt>
                <dd className="text-sm text-gray-900">
                  ฿{priceDetails.breakdown.electricity.toLocaleString()}
                </dd>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <dt className="text-sm font-medium text-gray-900">รวมทั้งหมด</dt>
              <dd className="text-sm font-medium text-gray-900">
                ฿{priceDetails.total.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <EditRoomModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        room={room}
        roomTypes={roomTypes}
        dormId={dormId}
        totalFloors={totalFloors}
        onSuccess={handleEditSuccess}
        dormitoryConfig={dormitoryConfig}
      />
    </div>
  );
} 