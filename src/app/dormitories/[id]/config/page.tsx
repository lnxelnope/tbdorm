"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import { Building2, Plus, Save, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { toast } from "sonner";
import { RoomType, DormitoryConfig, Dormitory } from "@/types/dormitory";
import { getDormitory, updateDormitory } from '@/lib/firebase/firebaseUtils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { getBillingConditions, saveBillingConditions } from "@/lib/firebase/firebaseUtils";

interface Config extends Omit<DormitoryConfig, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

interface DormitoryData {
  config: Config;
  dueDate?: number;
}

// เพิ่ม interface สำหรับเงื่อนไขการออกบิล
interface BillingConditions {
  allowedDaysBeforeDueDate: number;
  waterBillingType: "perPerson" | "perUnit";
  electricBillingType: "perUnit";
  lateFeeRate: number;
  billingDay: number;
}

// เพิ่ม interface สำหรับ AdditionalFeeItem
interface AdditionalFeeItem {
  id: string;
  name: string;
  amount: number;
}

export default function DormitoryConfigPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [config, setConfig] = useState<Config>({
    roomTypes: {},
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
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const [dueDate, setDueDate] = useState<number>(5); // default to 5th of month
  const [billingConditions, setBillingConditions] = useState<BillingConditions>({
    allowedDaysBeforeDueDate: 0,
    waterBillingType: "perPerson",
    electricBillingType: "perUnit",
    lateFeeRate: 0,
    billingDay: 1,
  });
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState<number | null>(null);
  const [dormitoryData, setDormitoryData] = useState<Dormitory | null>(null);

  // แปลง roomTypes object เป็น array
  const roomTypesArray = Object.entries(config.roomTypes).map(([roomId, type]) => ({
    ...type,
  }));

  useEffect(() => {
    const fetchDormitory = async () => {
      try {
        const [dormResult, billingResult] = await Promise.all([
          getDormitory(params.id),
          getBillingConditions(params.id)
        ]);

        if (dormResult.success && dormResult.data) {
          setDormitoryData(dormResult.data);
          const defaultConfig: Config = {
            roomTypes: {},
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
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const existingConfig = dormResult.data.config ? {
            ...dormResult.data.config,
            createdAt: new Date(dormResult.data.config.createdAt),
            updatedAt: new Date(dormResult.data.config.updatedAt)
          } : defaultConfig;

          setConfig(existingConfig);

          // สร้าง floorRates ตามจำนวนชั้นของหอพัก
          if (dormResult.data.totalFloors) {
            const floorRates: Record<string, number | null> = {};
            for (let i = 1; i <= dormResult.data.totalFloors; i++) {
              floorRates[i.toString()] = null;
            }
            setConfig(prev => ({
              ...prev,
              additionalFees: {
                ...prev.additionalFees,
                floorRates
              }
            }));
          }
        }

        if (billingResult.success && billingResult.data) {
          setBillingConditions(billingResult.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchDormitory();
  }, [params.id]);

  const handleAddRoomType = () => {
    const newId = Date.now().toString();
    const newRoomType = {
      id: newId,
      name: "",
      basePrice: 0,
      isDefault: false,
      description: "",
      facilities: []
    } satisfies RoomType;
    
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

  const handleSaveConfig = async () => {
    try {
      setIsLoading(true);
      
      // Log ข้อมูลก่อนบันทึก
      console.log('กำลังบันทึกการตั้งค่าหอพัก:', {
        dormitoryId: params.id,
        configData: config,
        billingConditions
      });

      // บันทึกข้อมูลลงใน dormitory document โดยตรง
      const dormRef = doc(db, 'dormitories', params.id);
      await updateDoc(dormRef, {
        config: {
          roomTypes: config.roomTypes || {},
          additionalFees: {
            utilities: {
              water: {
                perPerson: config.additionalFees?.utilities?.water?.perPerson || null
              },
              electric: {
                unit: config.additionalFees?.utilities?.electric?.unit || null
              }
            },
            items: config.additionalFees?.items || [],
            floorRates: config.additionalFees?.floorRates || {}
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      });

      // บันทึก billingConditions แยก
      const billingRef = doc(db, `dormitories/${params.id}/settings/billing`);
      await setDoc(billingRef, {
        ...billingConditions,
        updatedAt: serverTimestamp()
      });

      console.log('บันทึกการตั้งค่าสำเร็จ');
      toast.success('บันทึกการตั้งค่าเรียบร้อย');
      router.push("/dormitories");

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึก:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillingConditionChange = (field: keyof BillingConditions, value: any) => {
    setBillingConditions(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getAdditionalFeeValue = (name: string) => {
    const item = config.additionalFees.items.find(item => item.name === name);
    return item?.amount ?? '';
  };

  const handleAddItem = () => {
    if (!newItemName || newItemAmount === null) {
      toast.error("กรุณากรอกชื่อและจำนวนเงินให้ครบถ้วน");
      return;
    }

    const newItem: AdditionalFeeItem = {
      id: Date.now().toString(),
      name: newItemName,
      amount: newItemAmount
    };

    setConfig(prev => ({
      ...prev,
      additionalFees: {
        ...prev.additionalFees,
        items: [...prev.additionalFees.items, newItem]
      }
    }));

    setNewItemName("");
    setNewItemAmount(null);
  };

  const handleRemoveItem = (itemId: string) => {
    setConfig(prev => ({
      ...prev,
      additionalFees: {
        ...prev.additionalFees,
        items: prev.additionalFees.items.filter(item => item.id !== itemId)
      }
    }));
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
        <div className="flex justify-between items-center">
          <Link
            href="/dormitories"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            ย้อนกลับ
          </Link>
          <button
            onClick={handleSaveConfig}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                บันทึก
              </>
            )}
          </button>
        </div>
      </div>

      {/* กำหนดราคา */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">กำหนดราคา</h2>
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
          <h2 className="text-lg font-medium text-gray-900">
            ค่าบริการเพิ่มเติม
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">ค่าบริการเพิ่มเติม</h3>
              <div className="flex gap-4">
                <Input
                  type="text"
                  placeholder="ชื่อค่าบริการ"
                  value={newItemName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewItemName(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="จำนวนเงิน"
                  value={newItemAmount ?? ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewItemAmount(Number(e.target.value))}
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  เพิ่ม
                </button>
              </div>
              <div className="space-y-2">
                {config.additionalFees.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <span className="flex-1">{item.name}</span>
                    <span>{item.amount} บาท</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ค่าตามชั้น */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">ค่าตามชั้น</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {dormitoryData?.totalFloors && Array.from({ length: dormitoryData.totalFloors }, (_, i) => i + 1).map((floor) => (
                <div key={floor} className="relative">
                  <label className="block text-sm text-gray-600 mb-1">
                    ชั้น {floor}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={config.additionalFees.floorRates[floor.toString()] ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setConfig(prev => ({
                          ...prev,
                          additionalFees: {
                            ...prev.additionalFees,
                            floorRates: {
                              ...prev.additionalFees.floorRates,
                              [floor.toString()]: value === '' ? null : Number(value),
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ค่าน้ำค่าไฟ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            ค่าน้ำค่าไฟ
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ค่าน้ำ */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">ค่าน้ำ</h3>
              <div className="space-y-2">
                <label className="block text-sm text-gray-900">
                  ค่าน้ำแบบเหมาจ่าย (ต่อคน)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={config?.additionalFees?.utilities?.water?.perPerson ?? ''}
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
              <h3 className="text-sm font-medium text-gray-900">ค่าไฟ</h3>
              <div className="space-y-2">
                <label className="block text-sm text-gray-900">
                  ค่าไฟต่อหน่วย
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={config?.additionalFees?.utilities?.electric?.unit ?? ''}
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

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          วันครบกำหนดชำระค่าเช่า (วันที่เท่าไหร่ของเดือน)
        </label>
        <input
          type="number"
          min="1"
          max="31"
          value={dueDate}
          onChange={(e) => setDueDate(parseInt(e.target.value))}
          className="w-full max-w-xs p-2 border rounded"
        />
      </div>

      {/* เพิ่มส่วน UI สำหรับตั้งค่าเงื่อนไขการออกบิล */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>เงื่อนไขการออกบิล</CardTitle>
          <CardDescription>
            กำหนดเงื่อนไขและข้อกำหนดในการออกบิล
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">วันที่ออกบิลประจำเดือน</label>
                <p className="text-sm text-gray-500">กำหนดวันที่ออกบิลประจำเดือนของหอพัก</p>
              </div>
              <select
                value={billingConditions.billingDay}
                onChange={(e) => handleBillingConditionChange('billingDay', parseInt(e.target.value))}
                className="w-24 rounded-md border-gray-300"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">จำนวนวันที่สามารถออกบิลก่อนถึงกำหนด</label>
                <p className="text-sm text-gray-500">กำหนดว่าสามารถออกบิลล่วงหน้าได้กี่วันก่อนถึงกำหนดชำระ</p>
              </div>
              <input
                type="number"
                value={billingConditions.allowedDaysBeforeDueDate}
                onChange={(e) => handleBillingConditionChange('allowedDaysBeforeDueDate', parseInt(e.target.value))}
                className="w-24 rounded-md border-gray-300"
                min={0}
                max={31}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">อัตราค่าปรับจ่ายช้า (%)</label>
                <p className="text-sm text-gray-500">เปอร์เซ็นต์ค่าปรับเมื่อชำระเกินกำหนด</p>
              </div>
              <input
                type="number"
                value={billingConditions.lateFeeRate}
                onChange={(e) => handleBillingConditionChange('lateFeeRate', parseFloat(e.target.value))}
                className="w-24 rounded-md border-gray-300"
                min={0}
                step={0.1}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 