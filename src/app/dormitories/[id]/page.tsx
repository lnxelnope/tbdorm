"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Edit, Settings, CheckCircle, XCircle, LayoutDashboard, Home, Boxes, Users, Gauge, Receipt, FileText } from "lucide-react";
import { toast } from "sonner";
import { getDormitory, getDormitoryStats } from "@/lib/firebase/firebaseUtils";
import { Dormitory, DormitoryStats, Room } from "@/types/dormitory";
import { useRouter, useParams } from "next/navigation";
import React from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";

// แยก Loading component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );
}

export default function DormitoryPage() {
  const router = useRouter();
  const params = useParams();
  const dormId = params?.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [dormitory, setDormitory] = useState<Dormitory | null>(null);
  const [stats, setStats] = useState<{
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    maintenanceRooms: number;
  } | null>(null);

  const menuItems = [
    {
      name: "แดชบอร์ด",
      icon: LayoutDashboard,
      href: `/dormitories/${dormId}/dashboard`,
      description: "ภาพรวมของหอพัก",
    },
    {
      name: "ห้องพัก",
      href: `/dormitories/${dormId}/rooms`,
      icon: Home,
    },
    {
      name: "รูปแบบห้อง",
      href: `/dormitories/${dormId}/room-types`,
      icon: Boxes,
    },
    {
      name: "ผู้เช่า",
      href: `/dormitories/${dormId}/tenants`,
      icon: Users,
    },
    {
      name: "มิเตอร์",
      href: `/dormitories/${dormId}/utilities`,
      icon: Gauge,
    },
    {
      name: "บิล",
      href: `/dormitories/${dormId}/bills`,
      icon: Receipt,
    },
    {
      name: "รายงาน",
      href: `/dormitories/${dormId}/reports`,
      icon: FileText,
    },
    {
      name: "ตั้งค่า",
      href: `/dormitories/${dormId}/config`,
      icon: Settings,
    },
  ];

  useEffect(() => {
    const fetchDormitory = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, "dormitories", dormId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setDormitory({ id: docSnap.id, ...docSnap.data() } as Dormitory);
          
          // โหลดข้อมูลสถิติห้องพัก
          const roomsRef = collection(db, "dormitories", dormId, "rooms");
          const roomsSnap = await getDocs(roomsRef);
          const rooms = roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Room[];
          
          const stats = {
            totalRooms: rooms.length,
            occupiedRooms: rooms.filter(room => room.status === 'occupied').length,
            availableRooms: rooms.filter(room => room.status === 'available').length,
            maintenanceRooms: rooms.filter(room => room.status === 'maintenance').length,
          };
          
          setStats(stats);
        }
      } catch (error) {
        console.error("Error fetching dormitory:", error);
        toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
      } finally {
        setIsLoading(false);
      }
    };

    if (dormId) {
      fetchDormitory();
    }
  }, [dormId]);

  if (!dormId) {
    return <LoadingSpinner />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!dormitory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-500">ไม่พบข้อมูลหอพัก</p>
          <Link
            href="/dormitories"
            className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับไปหน้ารายการหอพัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/dormitories"
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับ
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/dormitories/${dormId}/edit`}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150"
            >
              <Edit className="w-4 h-4 mr-1" />
              แก้ไข
            </Link>
            <Link
              href={`/dormitories/${dormId}/config`}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 border-2 border-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <Settings className="w-4 h-4 mr-1" />
              ตั้งค่า
            </Link>
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">{dormitory.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{dormitory.address}</p>
      </div>

      {/* เพิ่มเมนูการจัดการ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center">
              <item.icon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {item.name}
                </h3>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลทั่วไป</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">ชื่อหอพัก</dt>
              <dd className="mt-1 text-sm text-gray-900">{dormitory.name}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">สถานะ</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  dormitory.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {dormitory.status === "active" ? "เปิดให้บริการ" : "ปิดให้บริการ"}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">ที่อยู่</dt>
              <dd className="mt-1 text-sm text-gray-900">{dormitory.address || "-"}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</dt>
              <dd className="mt-1 text-sm text-gray-900">{dormitory.phone || "-"}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">จำนวนชั้น</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {dormitory.totalFloors === 0 ? "ผสม (มีทั้ง 1 ชั้นและ 2 ชั้น)" : `${dormitory.totalFloors} ชั้น`}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">พิกัด</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {dormitory.location?.latitude && dormitory.location?.longitude ? (
                  <a
                    href={`https://www.google.com/maps?q=${dormitory.location.latitude},${dormitory.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ดูแผนที่ Google Maps
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">สิ่งอำนวยความสะดวก</h2>
          {dormitory.facilities && dormitory.facilities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">ความปลอดภัย</h3>
                <ul className="space-y-1">
                  {["กล้องวงจรปิด", "ระบบคีย์การ์ด", "รปภ."].map(facility => (
                    <li key={facility} className="flex items-center text-sm text-gray-700">
                      {dormitory.facilities?.includes(facility) ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mr-2" />
                      )}
                      {facility}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">อินเทอร์เน็ต</h3>
                <ul className="space-y-1">
                  {["Wi-Fi", "อินเทอร์เน็ตไฟเบอร์"].map(facility => (
                    <li key={facility} className="flex items-center text-sm text-gray-700">
                      {dormitory.facilities?.includes(facility) ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mr-2" />
                      )}
                      {facility}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">ที่จอดรถ</h3>
                <ul className="space-y-1">
                  {["ที่จอดรถยนต์", "ที่จอดรถมอเตอร์ไซค์", "ที่จอดรถมีหลังคา"].map(facility => (
                    <li key={facility} className="flex items-center text-sm text-gray-700">
                      {dormitory.facilities?.includes(facility) ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mr-2" />
                      )}
                      {facility}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">สิ่งอำนวยความสะดวกทั่วไป</h3>
                <ul className="space-y-1">
                  {["ลิฟต์", "ร้านซัก-รีด", "เครื่องซักผ้าหยอดเหรียญ"].map(facility => (
                    <li key={facility} className="flex items-center text-sm text-gray-700">
                      {dormitory.facilities?.includes(facility) ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mr-2" />
                      )}
                      {facility}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">ร้านค้าและบริการ</h3>
                <ul className="space-y-1">
                  {["ร้านสะดวกซื้อ", "ร้านอาหาร", "ตู้น้ำดื่มหยอดเหรียญ"].map(facility => (
                    <li key={facility} className="flex items-center text-sm text-gray-700">
                      {dormitory.facilities?.includes(facility) ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300 mr-2" />
                      )}
                      {facility}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">ไม่มีข้อมูลสิ่งอำนวยความสะดวก</p>
          )}
        </div>

        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">สถิติห้องพัก</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <dt className="text-sm font-medium text-blue-900">จำนวนห้องทั้งหมด</dt>
              <dd className="mt-1 text-2xl font-semibold text-blue-900">{stats?.totalRooms || 0} ห้อง</dd>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <dt className="text-sm font-medium text-green-900">ห้องที่มีผู้เช่า</dt>
              <dd className="mt-1 text-2xl font-semibold text-green-900">{stats?.occupiedRooms || 0} ห้อง</dd>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <dt className="text-sm font-medium text-yellow-900">ห้องว่าง</dt>
              <dd className="mt-1 text-2xl font-semibold text-yellow-900">{stats?.availableRooms || 0} ห้อง</dd>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <dt className="text-sm font-medium text-red-900">ห้องปิดปรับปรุง</dt>
              <dd className="mt-1 text-2xl font-semibold text-red-900">{stats?.maintenanceRooms || 0} ห้อง</dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 