"use client";

import React, { useEffect, useState } from "react";
import { Building2, Plus, Save, Trash2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { toast } from "sonner";
import { RoomType } from "@/types/dormitory";

interface Config {
  roomTypes: Record<string, RoomType>;
  additionalFees: {
    airConditioner: number | null;
    parking: number | null;
    floorRates: Record<string, number | null>;
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

export default function DormitoryConfigPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [config, setConfig] = useState<Config>({
    roomTypes: {},
    additionalFees: {
      airConditioner: null,
      parking: null,
      floorRates: {},
      utilities: {
        water: {
          perPerson: null,
        },
        electric: {
          unit: null,
        },
      },
    },
  });

  // แปลง roomTypes object เป็น array
  const roomTypesArray = Object.entries(config.roomTypes).map(([roomId, type]) => ({
    ...type,
  }));

  useEffect(() => {
    const fetchDormitory = async () => {
      try {
        const docRef = doc(db, "dormitories", params.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig(data.config || {
            roomTypes: {},
            additionalFees: {
              airConditioner: null,
              parking: null,
              floorRates: {},
              utilities: {
                water: {
                  perPerson: null,
                },
                electric: {
                  unit: null,
                },
              },
            },
          });
        }
      } catch (error) {
        console.error("Error fetching dormitory:", error);
        toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchDormitory();
  }, [params.id]);

  const handleAddRoomType = () => {
    const newId = Date.now().toString();
    const newRoomType: RoomType = {
      id: newId,
      name: "",
      basePrice: 0,
      isDefault: false,
      airConditionerFee: 500,
      parkingFee: 500,
    };
    
    setConfig({
      ...config,
      roomTypes: {
        ...config.roomTypes,
        [newId]: newRoomType,
      },
    });
  };

  const handleRemoveRoomType = (id: string) => {
    if (Object.keys(config.roomTypes).length <= 1) {
      toast.error("ต้องมีรูปแบบห้องอย่างน้อย 1 รูปแบบ");
      return;
    }

    // ถ้าลบห้องที่เป็น default ให้กำหนดห้องแรกที่เหลือเป็น default แทน
    const isRemovingDefault = config.roomTypes[id].isDefault;
    const newRoomTypes = { ...config.roomTypes };
    delete newRoomTypes[id];

    if (isRemovingDefault && Object.keys(newRoomTypes).length > 0) {
      const firstRoomId = Object.keys(newRoomTypes)[0];
      newRoomTypes[firstRoomId] = {
        ...newRoomTypes[firstRoomId],
        isDefault: true,
      };
    }

    setConfig({
      ...config,
      roomTypes: newRoomTypes,
    });
  };

  const handleRoomTypeChange = (id: string, field: keyof RoomType, value: any) => {
    if (field === "isDefault" && value === true) {
      // ถ้าตั้งเป็น default ให้ยกเลิก default ของห้องอื่น
      const newRoomTypes = { ...config.roomTypes };
      Object.keys(newRoomTypes).forEach((roomId) => {
        if (roomId !== id) {
          newRoomTypes[roomId] = {
            ...newRoomTypes[roomId],
            isDefault: false,
          };
        }
      });
      
      setConfig({
        ...config,
        roomTypes: {
          ...newRoomTypes,
          [id]: {
            ...config.roomTypes[id],
            [field]: value,
          },
        },
      });
    } else {
      setConfig({
        ...config,
        roomTypes: {
          ...config.roomTypes,
          [id]: {
            ...config.roomTypes[id],
            [field]: value,
          },
        },
      });
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // ตรวจสอบว่ามีห้องที่เป็น default อย่างน้อย 1 ห้อง
      const hasDefaultRoom = roomTypesArray.some(type => type.isDefault);
      if (!hasDefaultRoom) {
        toast.error("กรุณาเลือกรูปแบบห้องเริ่มต้นอย่างน้อย 1 รูปแบบ");
        return;
      }

      // ตรวจสอบว่าทุกห้องมีชื่อ
      const hasEmptyName = roomTypesArray.some(type => !type.name.trim());
      if (hasEmptyName) {
        toast.error("กรุณากรอกชื่อรูปแบบห้องให้ครบทุกห้อง");
        return;
      }

      const docRef = doc(db, "dormitories", params.id);
      await updateDoc(docRef, { config });
      
      toast.success("บันทึกการตั้งค่าเรียบร้อย");
      router.push("/dormitories");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
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
    <div className="space-y-8 p-6">
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              ตั้งค่าหอพัก
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              กำหนดราคาและค่าบริการเพิ่มเติม
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-sm transition-all duration-150 ease-in-out hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>

      {/* กำหนดราคา */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">กำหนดราคา</h2>
            <button
              onClick={handleAddRoomType}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors duration-150"
            >
              <Plus className="w-4 h-4 mr-1" />
              เพิ่มราคา
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {roomTypesArray.map((type) => (
            <div
              key={type.id}
              className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-lg hover:border-blue-100 transition-colors duration-150 bg-gray-50 hover:bg-blue-50/20"
            >
              <Building2 className="w-5 h-5 text-blue-500" />
              <input
                type="text"
                value={type.name}
                onChange={(e) =>
                  handleRoomTypeChange(type.id, "name", e.target.value)
                }
                placeholder="ชื่อราคา"
                className="flex-1 text-sm bg-yellow-50 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-150"
              />
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={type.basePrice ?? ''}
                  onChange={(e) =>
                    handleRoomTypeChange(type.id, "basePrice", e.target.value === '' ? null : Number(e.target.value))
                  }
                  placeholder="ราคา"
                  className="w-32 text-sm bg-yellow-50 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-150"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">บาท</span>
              </div>
              <label className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-200">
                <input
                  type="checkbox"
                  checked={type.isDefault}
                  onChange={(e) =>
                    handleRoomTypeChange(type.id, "isDefault", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors duration-150"
                />
                <span className="text-sm text-gray-700">ค่าเริ่มต้น</span>
              </label>
              <button
                onClick={() => handleRemoveRoomType(type.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-150"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ค่าบริการเพิ่มเติม */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-white">
            ค่าบริการเพิ่มเติม
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                ค่าบริการเครื่องปรับอากาศ
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={config.additionalFees.airConditioner ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      additionalFees: {
                        ...config.additionalFees,
                        airConditioner: e.target.value === '' ? null : Number(e.target.value),
                      },
                    })
                  }
                  placeholder="ค่าบริการ"
                  className="w-full text-sm bg-yellow-50 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-150"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">บาท</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                ค่าที่จอดรถส่วนตัว
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={config.additionalFees.parking ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      additionalFees: {
                        ...config.additionalFees,
                        parking: e.target.value === '' ? null : Number(e.target.value),
                      },
                    })
                  }
                  placeholder="ค่าบริการ"
                  className="w-full text-sm bg-yellow-50 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-150"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">บาท</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ค่าตามชั้น
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm text-gray-600 mb-1">
                  ชั้น 1
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={config.additionalFees.floorRates["1"] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConfig(prev => ({
                        ...prev,
                        additionalFees: {
                          ...prev.additionalFees,
                          floorRates: {
                            ...prev.additionalFees.floorRates,
                            "1": value === '' ? null : Number(value),
                          },
                        },
                      }));
                    }}
                    placeholder="ค่าตามชั้น"
                    className="w-full text-sm bg-yellow-50 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-150"
                  />
                  <span className="absolute right-3 top-2 text-sm text-gray-500">บาท</span>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm text-gray-600 mb-1">
                  ชั้น 2
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={config.additionalFees.floorRates["2"] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConfig(prev => ({
                        ...prev,
                        additionalFees: {
                          ...prev.additionalFees,
                          floorRates: {
                            ...prev.additionalFees.floorRates,
                            "2": value === '' ? null : Number(value),
                          },
                        },
                      }));
                    }}
                    placeholder="ค่าตามชั้น"
                    className="w-full text-sm bg-yellow-50 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-150"
                  />
                  <span className="absolute right-3 top-2 text-sm text-gray-500">บาท</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ค่าน้ำค่าไฟ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-white">
            ค่าน้ำค่าไฟ
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ค่าน้ำ */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">ค่าน้ำ</h3>
              <div className="space-y-2">
                <label className="block text-sm text-gray-600">
                  ค่าน้ำแบบเหมาจ่าย (ต่อคน)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={config.additionalFees.utilities.water.perPerson ?? ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        additionalFees: {
                          ...config.additionalFees,
                          utilities: {
                            ...config.additionalFees.utilities,
                            water: {
                              perPerson: e.target.value === '' ? null : Number(e.target.value),
                            },
                          },
                        },
                      })
                    }
                    placeholder="ค่าน้ำต่อคน"
                    className="w-full text-sm bg-yellow-50 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-150"
                  />
                  <span className="absolute right-3 top-2 text-sm text-gray-500">บาท/คน/เดือน</span>
                </div>
              </div>
            </div>

            {/* ค่าไฟ */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white">ค่าไฟ</h3>
              <div className="space-y-2">
                <label className="block text-sm text-gray-600">
                  ค่าไฟต่อหน่วย
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={config.additionalFees.utilities.electric.unit ?? ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        additionalFees: {
                          ...config.additionalFees,
                          utilities: {
                            ...config.additionalFees.utilities,
                            electric: {
                              unit: e.target.value === '' ? null : Number(e.target.value),
                            },
                          },
                        },
                      })
                    }
                    placeholder="ค่าไฟต่อหน่วย"
                    className="w-full text-sm bg-yellow-50 border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-150"
                  />
                  <span className="absolute right-3 top-2 text-sm text-gray-500">บาท/หน่วย</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 