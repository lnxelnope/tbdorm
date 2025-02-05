"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { addDormitory } from "@/lib/firebase/firebaseUtils";

interface FormData {
  name: string;
  address: string;
  totalFloors: number;
  phone: string;
  description: string;
  location: {
    latitude: string;
    longitude: string;
  };
  facilities: string[];
  images: string[];
  status: "active" | "inactive";
  config: {
    roomTypes: Record<string, never>;
  };
  floors: number;
}

export default function NewDormitoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    address: "",
    totalFloors: 1,
    phone: "",
    description: "",
    location: {
      latitude: "",
      longitude: "",
    },
    facilities: [],
    images: [],
    status: "active",
    config: {
      roomTypes: {},
    },
    floors: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error("กรุณากรอกชื่อหอพัก");
      return;
    }

    try {
      setIsSubmitting(true);

      const dormitoryData = {
        name: formData.name,
        address: formData.address,
        totalFloors: Number(formData.totalFloors),
        phone: formData.phone,
        description: formData.description,
        location: formData.location,
        facilities: formData.facilities,
        images: formData.images,
        status: formData.status,
        config: {
          roomTypes: {},
        },
        floors: formData.totalFloors,
      } as const;

      const result = await addDormitory(dormitoryData);

      if (result.success && result.id) {
        toast.success("เพิ่มหอพักเรียบร้อย");
        router.push("/dormitories");
      } else {
        toast.error("เกิดข้อผิดพลาดในการเพิ่มหอพัก");
      }
    } catch (error) {
      console.error("Error adding dormitory:", error);
      toast.error("เกิดข้อผิดพลาดในการเพิ่มหอพัก");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacilityChange = (facility: string, checked: boolean) => {
    const facilities = formData.facilities || [];
    setFormData({
      ...formData,
      facilities: checked
        ? [...facilities, facility]
        : facilities.filter(f => f !== facility)
    });
  };

  const extractCoordinates = (url: string) => {
    try {
      const patterns = [
        /@(-?\d+\.\d+),(-?\d+\.\d+)/,
        /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
        /\/(-?\d+\.\d+),(-?\d+\.\d+)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          const [_, lat, lng] = match;
          setFormData(prev => ({
            ...prev,
            location: {
              latitude: lat,
              longitude: lng
            }
          }));
          return;
        }
      }
      
      toast.error("ไม่พบพิกัดในลิงก์ที่แชร์มา กรุณาลองใหม่อีกครั้ง");
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการแยกพิกัด กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/dormitories"
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับ
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">เพิ่มหอพัก</h1>
        <p className="mt-1 text-sm text-gray-500">
          กรอกข้อมูลหอพักที่ต้องการเพิ่ม
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                ชื่อหอพัก <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="กรุณากรอกชื่อหอพัก"
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ที่อยู่
              </label>
              <textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                placeholder="กรุณากรอกที่อยู่หอพัก"
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                เบอร์โทรศัพท์
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="กรุณากรอกเบอร์โทรศัพท์"
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                พิกัด Google Maps
                <a 
                  href="https://www.google.com/maps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-700 text-xs"
                >
                  (คลิกเพื่อเปิด Google Maps)
                </a>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                วิธีที่ 1: เปิด Google Maps {">"} คลิกขวาที่ตำแหน่งหอพัก {">"} พิกัดจะแสดงในเมนูที่เด้งขึ้น
              </p>
              <p className="mt-1 text-xs text-gray-500">
                วิธีที่ 2: แชร์ลิงก์จาก Google Maps แล้วนำมาวางในช่องด้านล่าง
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                วางลิงก์ Google Maps
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  placeholder="วางลิงก์ที่แชร์มาจาก Google Maps"
                  onChange={(e) => extractCoordinates(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Latitude
                </label>
                <input
                  type="text"
                  placeholder="เช่น 14.882964"
                  value={formData.location.latitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: {
                        ...formData.location,
                        latitude: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Longitude
                </label>
                <input
                  type="text"
                  placeholder="เช่น 102.017601"
                  value={formData.location.longitude}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: {
                        ...formData.location,
                        longitude: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                จำนวนชั้น <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-8">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="floor1"
                      name="totalFloors"
                      value="1"
                      checked={formData.totalFloors === 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalFloors: parseInt(e.target.value),
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="floor1" className="ml-2 block text-sm text-gray-700">
                      1 ชั้น
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="floor2"
                      name="totalFloors"
                      value="2"
                      checked={formData.totalFloors === 2}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalFloors: parseInt(e.target.value),
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="floor2" className="ml-2 block text-sm text-gray-700">
                      2 ชั้น
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">สิ่งอำนวยความสะดวก</h3>
              <div className="grid grid-cols-3 gap-4">
                {/* ความปลอดภัย */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">ความปลอดภัย</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("กล้องวงจรปิด (CCTV)")}
                        onChange={(e) => handleFacilityChange("กล้องวงจรปิด (CCTV)", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">กล้องวงจรปิด (CCTV)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("ระบบคีย์การ์ด")}
                        onChange={(e) => handleFacilityChange("ระบบคีย์การ์ด", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">ระบบคีย์การ์ด</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("รปภ. / ยาม")}
                        onChange={(e) => handleFacilityChange("รปภ. / ยาม", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">รปภ. / ยาม</span>
                    </label>
                  </div>
                </div>

                {/* อินเทอร์เน็ต */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">อินเทอร์เน็ต</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("Wi-Fi")}
                        onChange={(e) => handleFacilityChange("Wi-Fi", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">Wi-Fi</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("อินเทอร์เน็ตไฟเบอร์")}
                        onChange={(e) => handleFacilityChange("อินเทอร์เน็ตไฟเบอร์", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">อินเทอร์เน็ตไฟเบอร์</span>
                    </label>
                  </div>
                </div>

                {/* ที่จอดรถ */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">ที่จอดรถ</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("ที่จอดรถยนต์")}
                        onChange={(e) => handleFacilityChange("ที่จอดรถยนต์", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">ที่จอดรถยนต์</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("ที่จอดรถมอเตอร์ไซค์")}
                        onChange={(e) => handleFacilityChange("ที่จอดรถมอเตอร์ไซค์", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">ที่จอดรถมอเตอร์ไซค์</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("ที่จอดรถจักรยาน")}
                        onChange={(e) => handleFacilityChange("ที่จอดรถจักรยาน", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">ที่จอดรถจักรยาน</span>
                    </label>
                  </div>
                </div>

                {/* สิ่งอำนวยความสะดวกทั่วไป */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">สิ่งอำนวยความสะดวกทั่วไป</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("ลิฟต์")}
                        onChange={(e) => handleFacilityChange("ลิฟต์", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">ลิฟต์</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("ร้านซัก-รีด")}
                        onChange={(e) => handleFacilityChange("ร้านซัก-รีด", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">ร้านซัก-รีด</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("เครื่องซักผ้าหยอดเหรียญ")}
                        onChange={(e) => handleFacilityChange("เครื่องซักผ้าหยอดเหรียญ", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">เครื่องซักผ้าหยอดเหรียญ</span>
                    </label>
                  </div>
                </div>

                {/* ร้านค้าและบริการ */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">ร้านค้าและบริการ</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("ร้านสะดวกซื้อ")}
                        onChange={(e) => handleFacilityChange("ร้านสะดวกซื้อ", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">ร้านสะดวกซื้อ</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("ร้านอาหาร")}
                        onChange={(e) => handleFacilityChange("ร้านอาหาร", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">ร้านอาหาร</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.facilities?.includes("ตู้น้ำหยอดเหรียญ")}
                        onChange={(e) => handleFacilityChange("ตู้น้ำหยอดเหรียญ", e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">ตู้น้ำหยอดเหรียญ</span>
                    </label>
                  </div>
                </div>
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