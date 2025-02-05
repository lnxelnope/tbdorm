"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getRooms, getRoomTypes, getDormitory, queryTenants } from "@/lib/firebase/firebaseUtils";
import { Room, RoomType, Tenant } from "@/types/dormitory";
import { toast } from "sonner";
import { calculateTotalPrice } from "../utils";

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

export default function RoomDetailsPage({ params }: { params: { id: string; roomNumber: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [dormitoryName, setDormitoryName] = useState("");
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [roomsResult, roomTypesResult, dormitoryResult, tenantsResult] = await Promise.all([
          getRooms(params.id),
          getRoomTypes(params.id),
          getDormitory(params.id),
          queryTenants(params.id)
        ]);

        if (roomsResult.success && roomsResult.data) {
          const foundRoom = roomsResult.data.find(r => r.number === params.roomNumber);
          if (foundRoom) {
            setRoom(foundRoom);
          }
        }

        if (roomTypesResult.success && roomTypesResult.data) {
          const foundRoomType = roomTypesResult.data.find(t => t.id === room?.roomType);
          if (foundRoomType) {
            setRoomType(foundRoomType);
          }
        }

        if (dormitoryResult.success && dormitoryResult.data) {
          setDormitoryName(dormitoryResult.data.name);
          setDormitoryConfig({
            additionalFees: {
              airConditioner: dormitoryResult.data.config?.additionalFees?.airConditioner ?? null,
              parking: dormitoryResult.data.config?.additionalFees?.parking ?? null,
              floorRates: dormitoryResult.data.config?.additionalFees?.floorRates || {},
              utilities: {
                water: {
                  perPerson: dormitoryResult.data.config?.additionalFees?.utilities?.water?.perPerson ?? null
                },
                electric: {
                  unit: dormitoryResult.data.config?.additionalFees?.utilities?.electric?.unit ?? null
                }
              }
            }
          });
        }

        if (tenantsResult.success && tenantsResult.data) {
          const foundTenant = tenantsResult.data.find(t => t.roomNumber === params.roomNumber);
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
    };

    loadData();
  }, [params.id, params.roomNumber, room?.roomType]);

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
            href={`/dormitories/${params.id}/rooms`}
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
      <div className="flex items-center gap-4">
        <Link
          href={`/dormitories/${params.id}/rooms`}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          กลับ
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">
          {dormitoryName} - ห้อง {room.number}
        </h1>
      </div>

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
                  {room.hasAirConditioner && (
                    <span className="inline-flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      แอร์
                    </span>
                  )}
                  {room.hasParking && (
                    <span className="inline-flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      ที่จอดรถ
                    </span>
                  )}
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
                {room.hasAirConditioner && dormitoryConfig.additionalFees.airConditioner && (
                  <div className="text-sm text-green-600">
                    <span className="font-medium">ค่าแอร์:</span> +฿{dormitoryConfig.additionalFees.airConditioner.toLocaleString()}
                  </div>
                )}
                {room.hasParking && dormitoryConfig.additionalFees.parking && (
                  <div className="text-sm text-purple-600">
                    <span className="font-medium">ที่จอดรถ:</span> +฿{dormitoryConfig.additionalFees.parking.toLocaleString()}
                  </div>
                )}
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
    </div>
  );
} 