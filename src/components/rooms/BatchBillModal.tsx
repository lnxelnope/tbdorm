"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { db } from "@/lib/firebase/firebase";
import { collection, addDoc, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Room, RoomType, DormitoryConfig } from "@/types/dormitory";
import { Tenant } from "@/types/tenant";
import { createBills } from "@/lib/firebase/billUtils";
import { AlertCircle } from "lucide-react";

interface BatchBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormitoryId: string;
  selectedRooms: Room[];
  tenants: Tenant[];
  roomTypes: RoomType[];
  dormitoryConfig: DormitoryConfig;
  onSuccess: () => void;
}

// เพิ่ม interface สำหรับข้อมูลที่ต้องใช้ในการสร้างบิล
interface CreateBillData {
  dormitoryId: string;
  roomId: string;
  roomNumber: string;
  tenantId: string;
  tenantName: string;
  month: number;
  year: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  items: {
    name: string;
    type: 'rent' | 'water' | 'electric' | 'other';
    amount: number;
    description?: string;
    unitPrice?: number;
    units?: number;
  }[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments: any[];
  notificationsSent: {
    initial: boolean;
    reminder: boolean;
    overdue: boolean;
  };
  lateFeeRate: number;
}

export default function BatchBillModal({ 
  isOpen, 
  onClose, 
  dormitoryId, 
  selectedRooms, 
  tenants, 
  roomTypes, 
  dormitoryConfig, 
  onSuccess 
}: BatchBillModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // ดึงวันที่ออกบิลจาก config หรือใช้วันที่ปัจจุบัน
  const currentDate = new Date();
  const [billDate, setBillDate] = useState<Date>(currentDate);
  
  // ดึงวันครบกำหนดชำระจาก config หรือใช้วันที่ปัจจุบัน + 7 วัน
  const defaultDueDate = new Date(currentDate);
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);
  const [dueDate, setDueDate] = useState<Date | undefined>(defaultDueDate);
  
  const [includeRent, setIncludeRent] = useState(true);
  const [includeWater, setIncludeWater] = useState(true);
  const [includeElectricity, setIncludeElectricity] = useState(true);
  const [otherFees, setOtherFees] = useState<{ name: string; amount: number }[]>([
    { name: "", amount: 0 }
  ]);
  
  // ดึงข้อมูลรอบบิลและวันครบกำหนดจาก config
  useEffect(() => {
    // แสดงข้อมูล dormitoryConfig ทั้งหมดที่ได้รับมา
    console.log("dormitoryConfig ทั้งหมด:", dormitoryConfig);
    console.log("billingConditions ที่ได้รับ:", dormitoryConfig?.billingConditions);
    
    // ใช้ค่าจาก billingConditions ที่ถูกดึงมาจาก settings/billing โดยตรง
    // billingConditions เป็นส่วนที่ถูกดึงและใส่เข้ามาใน dormitoryConfig โดยตรงในฟังก์ชัน getDormitory
    if (dormitoryConfig?.billingConditions) {
      console.log("gracePeriod ที่ได้รับ:", dormitoryConfig.billingConditions.gracePeriod);
      console.log("ชนิดข้อมูลของ gracePeriod:", typeof dormitoryConfig.billingConditions.gracePeriod);
      console.log("ค่า gracePeriod แปลงเป็นตัวเลข:", Number(dormitoryConfig.billingConditions.gracePeriod));
      console.log("isNaN check:", isNaN(Number(dormitoryConfig.billingConditions.gracePeriod)));
      
      try {
        // กำหนดวันออกบิลตามรอบบิล
        const billingDay = dormitoryConfig.billingConditions.billingDay || 1;
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // สร้างวันที่ออกบิลตามรอบบิล
        const configBillDate = new Date(currentYear, currentMonth, billingDay);
        if (configBillDate > currentDate) {
          // ถ้าวันออกบิลยังมาไม่ถึง ให้ใช้เดือนก่อนหน้า
          configBillDate.setMonth(configBillDate.getMonth() - 1);
        }
        setBillDate(configBillDate);
        
        // ใช้ค่า gracePeriod จาก settings/billing โดยตรง
        const gracePeriod = dormitoryConfig.billingConditions.gracePeriod;
        
        // ต้องแน่ใจว่าเป็นตัวเลขหรือสตริงที่แปลงเป็นตัวเลขได้
        if (gracePeriod !== undefined && gracePeriod !== null) {
          // วันครบกำหนดคือวันที่ออกบิล + จำนวนวันผ่อนผัน (gracePeriod)
          const graceDays = Number(gracePeriod);
          
          if (!isNaN(graceDays)) {
            const configDueDate = new Date(configBillDate);
            configDueDate.setDate(configDueDate.getDate() + graceDays);
            setDueDate(configDueDate);
            
            console.log(`กำหนดวันครบกำหนดชำระจากการตั้งค่า: ออกบิลวันที่ ${configBillDate.getDate()}/${configBillDate.getMonth() + 1}/${configBillDate.getFullYear()} + ระยะเวลาผ่อนผัน ${graceDays} วัน = ${configDueDate.getDate()}/${configDueDate.getMonth() + 1}/${configDueDate.getFullYear()}`);
          } else {
            console.warn(`ค่า gracePeriod ไม่สามารถแปลงเป็นตัวเลขได้: ${gracePeriod}`);
            toast.error("ค่าระยะเวลาผ่อนผันในการตั้งค่าหอพักไม่ถูกต้อง (ไม่ใช่ตัวเลข) กรุณาตั้งค่าในหน้าตั้งค่าหอพักใหม่");
          }
        } else {
          console.warn("ไม่พบค่า gracePeriod ในการตั้งค่าหอพัก หรือค่าไม่ถูกต้อง กรุณาตั้งค่าในหน้าตั้งค่า");
          toast.error("ไม่พบค่าระยะเวลาผ่อนผันในการตั้งค่าหอพัก หรือค่าไม่ถูกต้อง กรุณาตั้งค่าในหน้าตั้งค่าหอพักก่อนสร้างบิล");
        }
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการกำหนดวันที่จากค่า config:", error);
        console.log("dormitoryConfig.billingConditions:", dormitoryConfig.billingConditions);
        toast.error("เกิดข้อผิดพลาดในการกำหนดวันที่จากค่าการตั้งค่า กรุณาตรวจสอบการตั้งค่าหอพัก");
      }
    } else {
      console.warn("ไม่พบการตั้งค่ารอบบิล (billingConditions) ในการตั้งค่าหอพัก");
      console.log("dormitoryConfig:", dormitoryConfig);
      toast.error("ไม่พบการตั้งค่ารอบบิลในการตั้งค่าหอพัก กรุณาตั้งค่าในหน้าตั้งค่าหอพักก่อนสร้างบิล");
    }
  }, [dormitoryConfig, currentDate, toast]);
  
  // ฟังก์ชันสร้างเลขที่บิล
  const generateBillNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().substring(2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV${year}${month}${day}${random}`;
  };
  
  const addOtherFee = () => {
    setOtherFees([...otherFees, { name: "", amount: 0 }]);
  };
  
  const updateOtherFee = (index: number, field: keyof typeof otherFees[0], value: string | number) => {
    const updatedFees = [...otherFees];
    if (field === 'amount') {
      updatedFees[index][field] = Number(value);
    } else {
      updatedFees[index][field] = value as string;
    }
    setOtherFees(updatedFees);
  };
  
  const removeOtherFee = (index: number) => {
    const updatedFees = [...otherFees];
    updatedFees.splice(index, 1);
    setOtherFees(updatedFees);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dueDate) {
      toast.error("กรุณาระบุวันครบกำหนดชำระ");
      return;
    }

    if (selectedRooms.length === 0) {
      toast.error("กรุณาเลือกห้องที่ต้องการสร้างบิล");
      return;
    }

    try {
      setIsLoading(true);
      
      // ตรวจสอบว่าวันที่ออกบิลถูกต้อง
      const billingMonth = billDate.getMonth() + 1; // getMonth() เริ่มจาก 0
      const billingYear = billDate.getFullYear();
      
      // สร้าง array สำหรับเก็บข้อมูลบิลที่จะสร้าง
      const billsToCreate: CreateBillData[] = [];
      
      // จัดเตรียมข้อมูลสำหรับแต่ละห้องที่เลือก
      for (const room of selectedRooms) {
        // หาผู้เช่าในห้องที่เลือก
        const tenant = tenants.find(t => t.roomNumber === room.number);
        
        // หาข้อมูลประเภทห้อง
        const roomType = roomTypes.find(type => type.id === room.roomType);
        
        if (!tenant) {
          console.warn(`ห้อง ${room.number} ไม่มีผู้เช่า`);
          continue; // ข้ามห้องที่ไม่มีผู้เช่า
        }
        
        if (!roomType) {
          console.warn(`ห้อง ${room.number} ไม่พบข้อมูลประเภทห้อง`);
          continue; // ข้ามห้องที่ไม่มีข้อมูลประเภทห้อง
        }
        
        // สร้างรายการค่าใช้จ่าย
        const items = [];
        
        // เพิ่มค่าเช่าห้อง
        if (includeRent) {
          items.push({
            name: "ค่าเช่าห้อง",
            type: "rent" as const,
            amount: roomType.basePrice || 0,
            description: roomType.name
          });
        }
        
        // เพิ่มค่าน้ำ
        if (includeWater) {
          const waterFeePerPerson = dormitoryConfig?.additionalFees?.utilities?.water?.perPerson || 0;
          const waterFee = tenant.numberOfResidents ? waterFeePerPerson * tenant.numberOfResidents : waterFeePerPerson;
          
          items.push({
            name: "ค่าน้ำ",
            type: "water" as const,
            amount: waterFee,
            description: tenant.numberOfResidents ? `${tenant.numberOfResidents} คน` : "เหมาจ่าย",
            unitPrice: waterFeePerPerson,
            units: tenant.numberOfResidents || 1
          });
        }
        
        // เพิ่มค่าไฟ
        if (includeElectricity && tenant.electricityUsage) {
          const electricityFeePerUnit = dormitoryConfig?.additionalFees?.utilities?.electric?.unit || 0;
          const electricityFee = tenant.electricityUsage.unitsUsed * electricityFeePerUnit;
          
          items.push({
            name: "ค่าไฟ",
            type: "electric" as const,
            amount: electricityFee,
            description: `${tenant.electricityUsage.unitsUsed.toFixed(2)} หน่วย (${tenant.electricityUsage.previousReading} → ${tenant.electricityUsage.currentReading})`,
            unitPrice: electricityFeePerUnit,
            units: tenant.electricityUsage.unitsUsed
          });
        }
        
        // เพิ่มค่าบริการเสริม (ถ้ามี)
        if (room.additionalServices?.length > 0) {
          const additionalFeeItems = dormitoryConfig?.additionalFees?.items || [];
          
          for (const serviceId of room.additionalServices) {
            const service = additionalFeeItems.find(item => item.id === serviceId);
            if (service) {
              items.push({
                name: service.name,
                type: "other" as const,
                amount: service.amount || 0,
                description: "บริการเสริม"
              });
            }
          }
        }
        
        // เพิ่มรายการพิเศษของผู้เช่า (เช่น ค่าเช่าอุปกรณ์เพิ่มเติม, ค่าปรับ ฯลฯ)
        if (tenant.specialItems?.length > 0) {
          for (const item of tenant.specialItems) {
            // ตรวจสอบว่ารายการนี้ยังอยู่ในช่วงที่ต้องจ่ายหรือไม่
            const isActive = item.duration === 0 || // ไม่มีกำหนด
                           (item.remainingBillingCycles !== undefined && item.remainingBillingCycles > 0); // ยังเหลือรอบบิลที่ต้องจ่าย
            
            if (isActive) {
              // คำนวณงวดปัจจุบันและงวดที่เหลือ
              let installmentDescription = "รายการพิเศษ";
              if (item.duration > 0 && item.remainingBillingCycles !== undefined) {
                const currentInstallment = item.duration - item.remainingBillingCycles + 1;
                installmentDescription = `งวดที่ ${currentInstallment}/${item.duration} (เหลืออีก ${item.remainingBillingCycles - 1 > 0 ? item.remainingBillingCycles - 1 : 0} งวด)`;
              }
              
              items.push({
                name: item.name,
                type: "other" as const,
                amount: item.amount || 0,
                description: installmentDescription
              });
            }
          }
        }
        
        // เพิ่มค่าใช้จ่ายอื่นๆ
        otherFees.forEach(fee => {
          if (fee.name && fee.amount > 0) {
            items.push({
              name: fee.name,
              type: "other" as const,
              amount: fee.amount
            });
          }
        });
        
        // คำนวณยอดรวม
        const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
        
        // เมื่อมีการกดบันทึก เพื่อคำนวณยอดรวมทั้งหมด
        const totalAmountWithOtherFees = totalAmount + otherFees.reduce((sum, fee) => {
          return fee.name && fee.amount > 0 ? sum + Number(fee.amount) : sum;
        }, 0);
        
        // สร้างข้อมูลบิล
        const billData: CreateBillData = {
          dormitoryId,
          roomId: room.id,
          roomNumber: room.number,
          tenantId: tenant.id,
          tenantName: tenant.name,
          month: billingMonth,
          year: billingYear,
          dueDate: dueDate,
          status: 'pending',
          items,
          totalAmount: totalAmountWithOtherFees,
          paidAmount: 0,
          remainingAmount: totalAmountWithOtherFees,
          lateFeeRate: dormitoryConfig.billingConditions?.lateFeeRate || 0,
          payments: [],
          notificationsSent: {
            initial: false,
            reminder: false,
            overdue: false
          }
        };
        
        billsToCreate.push(billData);
      }
      
      // ตรวจสอบว่ามีบิลที่จะสร้างหรือไม่
      if (billsToCreate.length === 0) {
        toast.error("ไม่มีห้องที่สามารถสร้างบิลได้");
        setIsLoading(false);
        return;
      }
      
      // สร้างบิลทั้งหมด
      console.log("กำลังสร้างบิล:", billsToCreate.length, "รายการ");
      const result = await createBills(dormitoryId, billsToCreate, false);
      
      if (result.success) {
        toast.success(`สร้างบิลสำเร็จ ${result.data?.length || 0} รายการ`);
        onSuccess();
        onClose();
      } else {
        if (result.error?.includes("มีบิล") && result.error?.includes("ในเดือนนี้อยู่แล้ว")) {
          if (window.confirm(`${result.error} ต้องการสร้างบิลซ้ำหรือไม่?`)) {
            // สร้างบิลใหม่โดยบังคับสร้าง
            const forceResult = await createBills(dormitoryId, billsToCreate, true);
            
            if (forceResult.success) {
              toast.success(`สร้างบิลสำเร็จ ${forceResult.data?.length || 0} รายการ`);
              onSuccess();
              onClose();
            } else {
              toast.error(`ไม่สามารถสร้างบิลได้: ${forceResult.error}`);
            }
          }
        } else {
          toast.error(`ไม่สามารถสร้างบิลได้: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการสร้างบิล:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedRooms.length > 1 
              ? `สร้างบิลแบบกลุ่ม (${selectedRooms.length} ห้อง)` 
              : `สร้างบิลสำหรับห้อง ${selectedRooms[0]?.number || ""}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4">
          {/* แสดงสรุปรายการทั้งหมด */}
          <div className="bg-blue-50 p-3 rounded-md">
            <h3 className="text-sm font-medium mb-2">สรุปยอดค่าใช้จ่ายทั้งหมด</h3>
            <div className="text-lg font-medium text-blue-700">
              {selectedRooms.reduce((total, room) => {
                const tenant = tenants.find(t => t.roomNumber === room.number);
                const roomType = roomTypes.find(type => type.id === room.roomType);
                
                if (!tenant || !roomType) return total;
                
                let roomTotal = 0;
                
                // คำนวณค่าเช่าห้อง
                if (includeRent) {
                  roomTotal += roomType.basePrice || 0;
                }
                
                // คำนวณค่าน้ำ
                if (includeWater) {
                  const waterFeePerPerson = dormitoryConfig?.additionalFees?.utilities?.water?.perPerson || 0;
                  roomTotal += tenant.numberOfResidents ? waterFeePerPerson * tenant.numberOfResidents : waterFeePerPerson;
                }
                
                // คำนวณค่าไฟ
                if (includeElectricity && tenant.electricityUsage) {
                  const electricityFeePerUnit = dormitoryConfig?.additionalFees?.utilities?.electric?.unit || 0;
                  roomTotal += tenant.electricityUsage.unitsUsed * electricityFeePerUnit;
                }
                
                // คำนวณค่าบริการเสริม
                if (room.additionalServices?.length > 0) {
                  const additionalFeeItems = dormitoryConfig?.additionalFees?.items || [];
                  
                  for (const serviceId of room.additionalServices) {
                    const service = additionalFeeItems.find(item => item.id === serviceId);
                    if (service) {
                      roomTotal += service.amount || 0;
                    }
                  }
                }
                
                // คำนวณค่าใช้จ่ายอื่นๆ
                otherFees.forEach(fee => {
                  if (fee.name && fee.amount > 0) {
                    roomTotal += fee.amount;
                  }
                });
                
                // คำนวณรายการพิเศษของผู้เช่า
                if (tenant.specialItems?.length > 0) {
                  const activeItems = tenant.specialItems.filter(item => 
                    item.duration === 0 || 
                    (item.remainingBillingCycles !== undefined && item.remainingBillingCycles > 0)
                  );
                  
                  for (const item of activeItems) {
                    roomTotal += item.amount || 0;
                  }
                }
                
                return total + roomTotal;
              }, 0).toLocaleString()} บาท
              
              {/* แสดงค่าใช้จ่ายเพิ่มเติม (ถ้ามี) */}
              {otherFees.filter(fee => fee.name && fee.amount > 0).length > 0 && (
                <div className="mt-1 text-sm text-blue-600">
                  + ค่าใช้จ่ายเพิ่มเติม: {otherFees.reduce((sum, fee) => {
                    return fee.name && fee.amount > 0 ? sum + Number(fee.amount) : sum;
                  }, 0).toLocaleString()} บาท
                </div>
              )}
              
              {/* แสดงยอดรวมทั้งหมด */}
              {otherFees.filter(fee => fee.name && fee.amount > 0).length > 0 && (
                <div className="mt-1 text-base font-semibold text-blue-800">
                  รวมทั้งสิ้น: {(
                    selectedRooms.reduce((total, room) => {
                      const tenant = tenants.find(t => t.roomNumber === room.number);
                      const roomType = roomTypes.find(type => type.id === room.roomType);
                      
                      if (!tenant || !roomType) return total;
                      
                      let roomTotal = 0;
                      
                      // คำนวณค่าเช่าห้อง
                      if (includeRent) {
                        roomTotal += roomType.basePrice || 0;
                      }
                      
                      // คำนวณค่าน้ำ
                      if (includeWater) {
                        const waterFeePerPerson = dormitoryConfig?.additionalFees?.utilities?.water?.perPerson || 0;
                        roomTotal += tenant.numberOfResidents ? waterFeePerPerson * tenant.numberOfResidents : waterFeePerPerson;
                      }
                      
                      // คำนวณค่าไฟ
                      if (includeElectricity && tenant.electricityUsage) {
                        const electricityFeePerUnit = dormitoryConfig?.additionalFees?.utilities?.electric?.unit || 0;
                        roomTotal += tenant.electricityUsage.unitsUsed * electricityFeePerUnit;
                      }
                      
                      // คำนวณค่าบริการเสริม
                      if (room.additionalServices?.length > 0) {
                        const additionalFeeItems = dormitoryConfig?.additionalFees?.items || [];
                        
                        for (const serviceId of room.additionalServices) {
                          const service = additionalFeeItems.find(item => item.id === serviceId);
                          if (service) {
                            roomTotal += service.amount || 0;
                          }
                        }
                      }
                      
                      // คำนวณรายการพิเศษของผู้เช่า
                      if (tenant.specialItems?.length > 0) {
                        const activeItems = tenant.specialItems.filter(item => 
                          item.duration === 0 || 
                          (item.remainingBillingCycles !== undefined && item.remainingBillingCycles > 0)
                        );
                        
                        for (const item of activeItems) {
                          roomTotal += item.amount || 0;
                        }
                      }
                      
                      return total + roomTotal;
                    }, 0) + 
                    otherFees.reduce((sum, fee) => {
                      return fee.name && fee.amount > 0 ? sum + Number(fee.amount) : sum;
                    }, 0)
                  ).toLocaleString()} บาท
                </div>
              )}
            </div>
          </div>
          
          {/* แสดงรายการห้องที่เลือก */}
          <div className="bg-gray-50 p-3 rounded-md">
            <h3 className="text-sm font-medium mb-2">ห้องที่เลือก ({selectedRooms.length})</h3>
            <div className="grid gap-2">
              {selectedRooms.map(room => {
                const tenant = tenants.find(t => t.roomNumber === room.number);
                const roomType = roomTypes.find(type => type.id === room.roomType);
                
                // คำนวณค่าใช้จ่ายของห้องนี้
                let roomTotal = 0;
                const breakdown = [];
                
                if (tenant && roomType) {
                  // คำนวณค่าเช่าห้อง
                  if (includeRent) {
                    const rentFee = roomType.basePrice || 0;
                    roomTotal += rentFee;
                    breakdown.push(`ค่าเช่า: ${rentFee.toLocaleString()} บาท`);
                  }
                  
                  // คำนวณค่าน้ำ
                  if (includeWater) {
                    const waterFeePerPerson = dormitoryConfig?.additionalFees?.utilities?.water?.perPerson || 0;
                    const waterFee = tenant.numberOfResidents ? waterFeePerPerson * tenant.numberOfResidents : waterFeePerPerson;
                    roomTotal += waterFee;
                    breakdown.push(`ค่าน้ำ: ${waterFee.toLocaleString()} บาท`);
                  }
                  
                  // คำนวณค่าไฟ
                  if (includeElectricity && tenant.electricityUsage) {
                    const electricityFeePerUnit = dormitoryConfig?.additionalFees?.utilities?.electric?.unit || 0;
                    const electricityFee = tenant.electricityUsage.unitsUsed * electricityFeePerUnit;
                    roomTotal += electricityFee;
                    breakdown.push(`ค่าไฟ: ${electricityFee.toLocaleString()} บาท (${tenant.electricityUsage.unitsUsed} หน่วย)`);
                  }
                  
                  // คำนวณค่าบริการเสริม
                  if (room.additionalServices?.length > 0) {
                    const additionalFeeItems = dormitoryConfig?.additionalFees?.items || [];
                    let additionalServiceTotal = 0;
                    
                    for (const serviceId of room.additionalServices) {
                      const service = additionalFeeItems.find(item => item.id === serviceId);
                      if (service) {
                        additionalServiceTotal += service.amount || 0;
                      }
                    }
                    
                    if (additionalServiceTotal > 0) {
                      roomTotal += additionalServiceTotal;
                      breakdown.push(`บริการเสริม: ${additionalServiceTotal.toLocaleString()} บาท`);
                    }
                  }
                  
                  // คำนวณรายการพิเศษของผู้เช่า
                  if (tenant.specialItems?.length > 0) {
                    let specialItemsTotal = 0;
                    const specialItemDetails: string[] = [];
                    
                    const activeItems = tenant.specialItems.filter(item => 
                      item.duration === 0 || 
                      (item.remainingBillingCycles !== undefined && item.remainingBillingCycles > 0)
                    );
                    
                    for (const item of activeItems) {
                      specialItemsTotal += item.amount || 0;
                      
                      // เพิ่มรายละเอียดของแต่ละรายการ
                      if (item.duration > 0 && item.remainingBillingCycles !== undefined) {
                        const currentInstallment = item.duration - item.remainingBillingCycles + 1;
                        specialItemDetails.push(`${item.name}: ${item.amount} บาท (งวด ${currentInstallment}/${item.duration})`);
                      } else {
                        specialItemDetails.push(`${item.name}: ${item.amount} บาท`);
                      }
                    }
                    
                    if (specialItemsTotal > 0) {
                      roomTotal += specialItemsTotal;
                      breakdown.push(`รายการพิเศษ: ${specialItemsTotal.toLocaleString()} บาท`);
                      
                      // เพิ่มรายละเอียดแต่ละรายการไปที่ breakdown
                      if (specialItemDetails.length > 0) {
                        breakdown.push(`&nbsp;&nbsp;(${specialItemDetails.join(', ')})`);
                      }
                    }
                  }
                }
                
                // เพิ่มรายการค่าใช้จ่ายอื่นๆ (ที่ผู้ใช้เพิ่มเอง)
                let otherFeesTotal = 0;
                if (otherFees.length > 0) {
                  const validOtherFees = otherFees.filter(fee => fee.name && fee.amount > 0);
                  if (validOtherFees.length > 0) {
                    otherFeesTotal = validOtherFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
                    roomTotal += otherFeesTotal;
                    
                    const otherFeeDetails = validOtherFees.map(fee => `${fee.name}: ${fee.amount} บาท`);
                    breakdown.push(`ค่าใช้จ่ายเพิ่มเติม: ${otherFeesTotal.toLocaleString()} บาท`);
                    if (otherFeeDetails.length > 0) {
                      breakdown.push(`  (${otherFeeDetails.join(', ')})`);
                    }
                  }
                }
                
                return (
                  <div key={room.id} className="p-2 bg-white border rounded-md">
                    <div className="flex justify-between">
                      <div>
                        <span className="font-medium">ห้อง {room.number}</span>
                        {tenant ? (
                          <span className="ml-1 text-gray-500">
                            ({tenant.name})
                          </span>
                        ) : (
                          <span className="ml-1 text-red-500 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            ไม่มีผู้เช่า
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-green-600">{roomTotal.toLocaleString()} บาท</div>
                    </div>
                    {breakdown.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        {breakdown.join(' • ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billDate">วันที่ออกบิล</Label>
                <DatePicker
                  id="billDate"
                  selected={billDate}
                  onSelect={setBillDate}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dueDate">วันครบกำหนดชำระ</Label>
                <div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                    <p className="text-xs text-blue-800 font-medium mb-1">วันครบกำหนดชำระถูกคำนวณอัตโนมัติจากการตั้งค่าหอพัก</p>
                    <div className="grid grid-cols-1 gap-1 text-xs text-blue-700">
                      <div className="flex justify-between">
                        <span>วันออกบิล:</span>
                        <span className="font-medium">{billDate ? format(billDate, 'd MMMM yyyy', { locale: th }) : "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ระยะเวลาผ่อนผัน:</span>
                        <span className="font-medium">
                          {dormitoryConfig?.billingConditions?.gracePeriod 
                            ? `${dormitoryConfig.billingConditions.gracePeriod} วัน` 
                            : "ไม่ได้ตั้งค่า"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>วันครบกำหนดชำระ:</span>
                        <span className="font-medium text-green-600">{dueDate ? format(dueDate, 'd MMMM yyyy', { locale: th }) : "-"}</span>
                      </div>
                    </div>
                  </div>
                  <DatePicker
                    id="dueDate"
                    selected={dueDate}
                    onSelect={setDueDate}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    หมายเหตุ: หากชำระเกินกำหนด จะมีค่าปรับ 
                    {dormitoryConfig?.billingConditions?.lateFeeRate !== undefined &&
                     dormitoryConfig?.billingConditions?.lateFeeRate !== null &&
                     !isNaN(Number(dormitoryConfig?.billingConditions?.lateFeeRate))
                     ? ` ${dormitoryConfig.billingConditions.lateFeeRate}` 
                     : " ไม่ได้ตั้งค่า"}% 
                    ของยอดค้างชำระ ตามการตั้งค่าหอพัก
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>รายการที่ต้องการเรียกเก็บ</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRent"
                    checked={includeRent}
                    onCheckedChange={(checked) => setIncludeRent(checked as boolean)}
                  />
                  <Label htmlFor="includeRent" className="cursor-pointer">ค่าเช่าห้อง</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeWater"
                    checked={includeWater}
                    onCheckedChange={(checked) => setIncludeWater(checked as boolean)}
                  />
                  <Label htmlFor="includeWater" className="cursor-pointer">ค่าน้ำ</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeElectricity"
                    checked={includeElectricity}
                    onCheckedChange={(checked) => setIncludeElectricity(checked as boolean)}
                  />
                  <Label htmlFor="includeElectricity" className="cursor-pointer">ค่าไฟฟ้า</Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>ค่าใช้จ่ายอื่นๆ (เพิ่มเติม)</Label>
              {otherFees.map((fee, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="ชื่อรายการ"
                    value={fee.name}
                    onChange={(e) => updateOtherFee(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="จำนวนเงิน"
                    value={fee.amount}
                    onChange={(e) => updateOtherFee(index, 'amount', e.target.value)}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeOtherFee(index)}
                    className="w-8 h-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addOtherFee}
                className="w-full"
              >
                + เพิ่มรายการ
              </Button>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "กำลังสร้างบิล..." : "สร้างบิล"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 