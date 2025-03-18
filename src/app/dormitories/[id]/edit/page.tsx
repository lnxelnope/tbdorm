"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { getDormitory, updateDormitory, addRoom } from "@/lib/firebase/firebaseUtils";
import { Dormitory, AdditionalFeeItem } from "@/types/dormitory";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import Image from "next/image";
import { useAuth } from "@/lib/hooks/useAuth";

interface Room {
  id: string;
  number: string;
  floor: number;
  dormitoryId: string;
  roomTypeId: string;
  hasAirConditioner: boolean;
  hasParking: boolean;
  status: 'available' | 'occupied' | 'maintenance';
}

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
  status: 'active' | 'inactive';
  config: {
    roomTypes: Record<string, any>;
    additionalFees: {
      utilities: {
        water: { perPerson: number | null };
        electric: { unit: number | null };
      };
      items: AdditionalFeeItem[];
      floorRates: Record<string, number | null>;
    };
  };
  floors: number;
}

export default function EditDormitoryPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [actualRoomCount, setActualRoomCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'images'>('info');
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
      additionalFees: {
        utilities: {
          water: { perPerson: null },
          electric: { unit: null }
        },
        items: [],
        floorRates: {}
      },
    },
    floors: 1,
  });
  const [originalImages, setOriginalImages] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await getDormitory(params.id);
        if (result.success && result.data) {
          setFormData({
            name: result.data.name || "",
            address: result.data.address || "",
            totalFloors: result.data.totalFloors || 1,
            phone: result.data.phone || "",
            description: result.data.description || "",
            location: {
              latitude: result.data.location?.latitude || "",
              longitude: result.data.location?.longitude || "",
            },
            facilities: result.data.facilities || [],
            images: result.data.images || [],
            status: result.data.status || "active",
            config: result.data.config || { roomTypes: {}, additionalFees: {
              utilities: {
                water: { perPerson: 0 },
                electric: { unit: 0 }
              },
              items: [],
              floorRates: {}
            } },
            floors: result.data.totalFloors || 1,
          });
          setOriginalImages(result.data.images || []);
        }
      } catch (error) {
        console.error("Error fetching dormitory:", error);
        toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomsRef = collection(db, "rooms");
        const q = query(roomsRef, where("dormitoryId", "==", params.id));
        const querySnapshot = await getDocs(q);
        setActualRoomCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดจำนวนห้องพัก");
      }
    };

    fetchRooms();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error("กรุณากรอกชื่อหอพัก");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("Submitting with totalFloors:", formData.totalFloors);

      const updateData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        totalFloors: Number(formData.totalFloors),
        floors: Number(formData.totalFloors),
        phone: formData.phone.trim(),
        description: formData.description.trim(),
        location: formData.location,
        facilities: formData.facilities,
        images: formData.images,
        status: formData.status,
        config: {
          ...formData.config,
          additionalFees: formData.config.additionalFees || {
            utilities: {
              water: { perPerson: null },
              electric: { unit: null }
            },
            items: [],
            floorRates: {}
          }
        },
      };

      console.log("Update data:", updateData);

      const result = await updateDormitory(params.id, updateData);

      if (result.success) {
        toast.success("บันทึกการแก้ไขเรียบร้อย");
        router.push("/dormitories");
      } else {
        toast.error("ไม่สามารถบันทึกการแก้ไขได้");
      }
    } catch (error) {
      console.error("Error updating dormitory:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSubmitting(false);
    }
  };

  const extractCoordinates = async (url: string) => {
    try {
      let targetUrl = url;

      // ถ้าเป็น Short URL ให้แปลงเป็น URL เต็มก่อน
      if (url.includes('maps.app.goo.gl')) {
        const response = await fetch('/api/maps/expand-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          throw new Error('Failed to expand URL');
        }

        const data = await response.json();
        targetUrl = data.url;
      }

      // รองรับหลายรูปแบบของ URL Google Maps
      const patterns = [
        /@(-?\d+\.\d+),(-?\d+\.\d+)/, // รูปแบบ @lat,lng
        /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // รูปแบบ !3d{lat}!4d{lng}
        /\/(-?\d+\.\d+),(-?\d+\.\d+)/, // รูปแบบ /lat,lng
        /place\/[^@]+@(-?\d+\.\d+),(-?\d+\.\d+)/, // รูปแบบ place/{name}@lat,lng
      ];

      // ตรวจสอบทุกรูปแบบ URL
      for (const pattern of patterns) {
        const match = targetUrl.match(pattern);
        if (match) {
          const [_, lat, lng] = match;
          setFormData(prev => ({
            ...prev,
            location: {
              latitude: lat,
              longitude: lng
            }
          }));
          toast.success("แยกพิกัดสำเร็จ");
          return;
        }
      }
      
      toast.error("ไม่พบพิกัดในลิงก์ กรุณาลองใหม่อีกครั้ง");
    } catch (error) {
      console.error("Error extracting coordinates:", error);
      toast.error("เกิดข้อผิดพลาดในการแยกพิกัด กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนอัพโหลดรูปภาพ");
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const newImages: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // ตรวจสอบขนาดไฟล์
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (ต้องไม่เกิน 5MB)`);
          continue;
        }

        // ตรวจสอบประเภทไฟล์
        if (!file.type.startsWith('image/')) {
          toast.error(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`);
          continue;
        }
        
        // ย่อขนาดรูปภาพ
        const resizedImage = await resizeImage(file, 800);
        
        // สร้าง metadata
        const metadata = {
          contentType: 'image/jpeg',
          cacheControl: 'public,max-age=3600'
        };
        
        // อัพโหลดไฟล์
        const storageRef = ref(storage, `dormitories/${params.id}/images/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, resizedImage, metadata);
        const url = await getDownloadURL(snapshot.ref);
        newImages.push(url);
      }

      if (newImages.length > 0) {
        // อัพเดทข้อมูลหอพัก
        const updatedImages = [...(formData.images || []), ...newImages];
        setFormData(prev => ({
          ...prev,
          images: updatedImages
        }));

        await updateDormitory(params.id, { images: updatedImages });
        toast.success("อัพโหลดรูปภาพสำเร็จ");
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    try {
      // ลบไฟล์จาก Storage
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);

      // อัพเดทข้อมูลหอพัก
      const updatedImages = formData.images?.filter(img => img !== imageUrl) || [];
      setFormData(prev => ({
        ...prev,
        images: updatedImages
      }));

      await updateDormitory(params.id, { images: updatedImages });
      toast.success("ลบรูปภาพสำเร็จ");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("เกิดข้อผิดพลาดในการลบรูปภาพ");
    }
  };

  const resizeImage = (file: File, maxWidth: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement('img') as HTMLImageElement;
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // คำนวณขนาดใหม่โดยรักษาอัตราส่วน
          const ratio = maxWidth / img.width;
          const width = maxWidth;
          const height = img.height * ratio;

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to convert canvas to blob'));
              }
            },
            'image/jpeg',
            0.9
          );
        };
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

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
        <h1 className="text-2xl font-semibold text-gray-900">แก้ไขข้อมูลหอพัก</h1>
        <p className="mt-1 text-sm text-gray-500">
          แก้ไขรายละเอียดข้อมูลหอพัก
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`${
              activeTab === 'info'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            ข้อมูลทั่วไป
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`${
              activeTab === 'images'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            รูปภาพ
          </button>
        </nav>
      </div>

      {activeTab === 'info' ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">ข้อมูลพื้นฐาน</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all duration-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อหอพัก <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border-0 p-0 focus:ring-0 sm:text-sm bg-transparent placeholder-gray-400"
                    placeholder="กรุณากรอกชื่อหอพัก"
                  />
                </div>

                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all duration-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="กรุณากรอกเบอร์โทรศัพท์"
                    className="w-full border-0 p-0 focus:ring-0 sm:text-sm bg-transparent placeholder-gray-400"
                  />
                </div>

                <div className="md:col-span-2 bg-white p-4 rounded-lg border-2 border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all duration-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ที่อยู่
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full border-0 p-0 focus:ring-0 sm:text-sm bg-transparent placeholder-gray-400"
                    placeholder="กรุณากรอกที่อยู่หอพัก"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    จำนวนชั้น <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.totalFloors}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setFormData({ 
                        ...formData, 
                        totalFloors: value,
                        floors: value // อัพเดท floors ด้วยเพื่อให้ข้อมูลตรงกัน
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* ข้อมูลตำแหน่งที่ตั้ง */}
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">ตำแหน่งที่ตั้ง</h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all duration-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ลิงก์ Google Maps
                  </label>
                  <input
                    type="text"
                    placeholder="วางลิงก์ Google Maps ที่นี่"
                    onChange={(e) => {
                      if (e.target.value) {
                        extractCoordinates(e.target.value);
                      }
                    }}
                    className="w-full border-0 p-0 focus:ring-0 sm:text-sm bg-transparent placeholder-gray-400"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    วิธีคัดลอกลิงก์: เปิด Google Maps {'>'} คลิกที่หมุด {'>'} Share {'>'} Copy link
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">พิกัดที่ตั้ง:</span>{' '}
                    {formData.location?.latitude && formData.location?.longitude ? (
                      <span className="text-blue-700">
                        {formData.location.latitude}, {formData.location.longitude}
                      </span>
                    ) : (
                      <span className="text-gray-500">ยังไม่ได้ระบุพิกัด</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ข้อมูลอาคาร */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">ข้อมูลอาคาร</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    สถานะหอพัก
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        value="active"
                        checked={formData.status === "active"}
                        onChange={(e) => setFormData({
                          ...formData,
                          status: e.target.value as "active" | "inactive",
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 text-sm text-gray-700">เปิดให้บริการ</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        value="inactive"
                        checked={formData.status === "inactive"}
                        onChange={(e) => setFormData({
                          ...formData,
                          status: e.target.value as "active" | "inactive",
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 text-sm text-gray-700">ปิดปรับปรุง</span>
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    จำนวนห้องพัก
                  </label>
                  <div className="flex items-center bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{actualRoomCount}</span> ห้อง
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    * จำนวนห้องพักจะถูกคำนวณจากข้อมูลในหน้าจัดการห้องพัก
                  </p>
                </div>
              </div>
            </div>

            {/* สิ่งอำนวยความสะดวก */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">สิ่งอำนวยความสะดวก</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* ความปลอดภัย */}
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all duration-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-4 pb-2 border-b">ความปลอดภัย</h4>
                  <div className="space-y-3">
                    {[
                      { id: "กล้องวงจรปิด", label: "กล้องวงจรปิด (CCTV)" },
                      { id: "ระบบคีย์การ์ด", label: "ระบบคีย์การ์ด" },
                      { id: "รปภ.", label: "รปภ. / ยาม" }
                    ].map((item) => (
                      <label key={item.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.facilities?.includes(item.id)}
                          onChange={(e) => {
                            const facilities = formData.facilities || [];
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                facilities: [...facilities, item.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                facilities: facilities.filter(f => f !== item.id)
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* อินเทอร์เน็ต */}
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all duration-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-4 pb-2 border-b">อินเทอร์เน็ต</h4>
                  <div className="space-y-3">
                    {[
                      { id: "Wi-Fi", label: "Wi-Fi" },
                      { id: "อินเทอร์เน็ตไฟเบอร์", label: "อินเทอร์เน็ตไฟเบอร์" }
                    ].map((item) => (
                      <label key={item.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.facilities?.includes(item.id)}
                          onChange={(e) => {
                            const facilities = formData.facilities || [];
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                facilities: [...facilities, item.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                facilities: facilities.filter(f => f !== item.id)
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ที่จอดรถ */}
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all duration-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-4 pb-2 border-b">ที่จอดรถ</h4>
                  <div className="space-y-3">
                    {[
                      { id: "ที่จอดรถยนต์", label: "ที่จอดรถยนต์" },
                      { id: "ที่จอดรถมอเตอร์ไซค์", label: "ที่จอดรถมอเตอร์ไซค์" },
                      { id: "ที่จอดรถมีหลังคา", label: "ที่จอดรถมีหลังคา" }
                    ].map((item) => (
                      <label key={item.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.facilities?.includes(item.id)}
                          onChange={(e) => {
                            const facilities = formData.facilities || [];
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                facilities: [...facilities, item.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                facilities: facilities.filter(f => f !== item.id)
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* สิ่งอำนวยความสะดวกทั่วไป */}
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all duration-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-4 pb-2 border-b">สิ่งอำนวยความสะดวกทั่วไป</h4>
                  <div className="space-y-3">
                    {[
                      { id: "ลิฟต์", label: "ลิฟต์" },
                      { id: "ร้านซัก-รีด", label: "ร้านซัก-รีด" },
                      { id: "เครื่องซักผ้าหยอดเหรียญ", label: "เครื่องซักผ้าหยอดเหรียญ" }
                    ].map((item) => (
                      <label key={item.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.facilities?.includes(item.id)}
                          onChange={(e) => {
                            const facilities = formData.facilities || [];
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                facilities: [...facilities, item.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                facilities: facilities.filter(f => f !== item.id)
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ร้านค้าและบริการ */}
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all duration-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-4 pb-2 border-b">ร้านค้าและบริการ</h4>
                  <div className="space-y-3">
                    {[
                      { id: "ร้านสะดวกซื้อ", label: "ร้านสะดวกซื้อ" },
                      { id: "ร้านอาหาร", label: "ร้านอาหาร" },
                      { id: "ตู้น้ำดื่มหยอดเหรียญ", label: "ตู้น้ำดื่มหยอดเหรียญ" }
                    ].map((item) => (
                      <label key={item.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.facilities?.includes(item.id)}
                          onChange={(e) => {
                            const facilities = formData.facilities || [];
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                facilities: [...facilities, item.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                facilities: facilities.filter(f => f !== item.id)
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t shadow-lg z-10">
            <Link
              href="/dormitories"
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border-2 border-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                รูปภาพหอพัก
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {formData.images?.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-w-3 aspect-h-2 rounded-lg overflow-hidden">
                      <Image
                        src={image}
                        alt={`รูปภาพหอพัก ${index + 1}`}
                        width={300}
                        height={200}
                        className="object-cover"
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7guYTguKHguYjguKrguLLguKPguJbguYPguIrguYnguKPguLnguJvguYTguJTguYk8L3RleHQ+PC9zdmc+';
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="relative block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="sr-only"
                    disabled={isUploading}
                  />
                  <div className="aspect-w-3 aspect-h-2 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400">
                    {isUploading ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">กำลังอัพโหลด...</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-1 text-sm text-gray-500">เพิ่มรูปภาพ</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                แนะนำให้ใช้รูปภาพขนาดไม่เกิน 2MB ต่อรูป
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 