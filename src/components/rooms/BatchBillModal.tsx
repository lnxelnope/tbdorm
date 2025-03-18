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
    if (dormitoryConfig.billingCycle) {
      try {
        // กำหนดวันออกบิลตามรอบบิล
        const billingDay = dormitoryConfig.billingCycle.billingDay || 1;
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // สร้างวันที่ออกบิลตามรอบบิล
        const configBillDate = new Date(currentYear, currentMonth, billingDay);
        if (configBillDate > currentDate) {
          // ถ้าวันออกบิลยังมาไม่ถึง ให้ใช้เดือนก่อนหน้า
          configBillDate.setMonth(configBillDate.getMonth() - 1);
        }
        setBillDate(configBillDate);
        
        // กำหนดวันครบกำหนดชำระ
        if (dormitoryConfig.billingCycle.gracePeriod) {
          const graceDays = dormitoryConfig.billingCycle.gracePeriod;
          const configDueDate = new Date(configBillDate);
          configDueDate.setDate(configDueDate.getDate() + graceDays);
          setDueDate(configDueDate);
        }
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการกำหนดวันที่จากค่า config:", error);
        // ใช้ค่าเริ่มต้นหากเกิดข้อผิดพลาด
      }
    }
  }, [dormitoryConfig]);
  
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
            amount: roomType.price || 0,
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
                amount: service.price || 0,
                description: "บริการเสริม"
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
          totalAmount,
          paidAmount: 0,
          remainingAmount: totalAmount,
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
                  roomTotal += roomType.price || 0;
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
                      roomTotal += service.price || 0;
                    }
                  }
                }
                
                // คำนวณค่าใช้จ่ายอื่นๆ
                otherFees.forEach(fee => {
                  if (fee.name && fee.amount > 0) {
                    roomTotal += fee.amount;
                  }
                });
                
                return total + roomTotal;
              }, 0).toLocaleString()} บาท
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
                    const rentFee = roomType.price || 0;
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
                        additionalServiceTotal += service.price || 0;
                      }
                    }
                    
                    if (additionalServiceTotal > 0) {
                      roomTotal += additionalServiceTotal;
                      breakdown.push(`บริการเสริม: ${additionalServiceTotal.toLocaleString()} บาท`);
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
                <DatePicker
                  id="dueDate"
                  selected={dueDate}
                  onSelect={setDueDate}
                />
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