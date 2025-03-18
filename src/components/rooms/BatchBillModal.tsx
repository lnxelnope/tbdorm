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
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() + 7))
  );
  const [includeRent, setIncludeRent] = useState(true);
  const [includeAdditionalServices, setIncludeAdditionalServices] = useState(true);
  const [includeWater, setIncludeWater] = useState(true);
  const [includeElectricity, setIncludeElectricity] = useState(true);
  const [waterRate, setWaterRate] = useState(18);
  const [electricityRate, setElectricityRate] = useState(8);
  const [otherFees, setOtherFees] = useState<{ name: string; amount: number }[]>([
    { name: "", amount: 0 }
  ]);

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

  const updateOtherFee = (index: number, field: "name" | "amount", value: string | number) => {
    const updatedFees = [...otherFees];
    updatedFees[index] = {
      ...updatedFees[index],
      [field]: value
    };
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
      
      // สร้าง array สำหรับเก็บข้อมูลบิลที่จะสร้าง
      const createdBills: any[] = [];
      
      // สร้างบิลสำหรับแต่ละห้องที่เลือก
      selectedRooms.forEach(room => {
        // หาผู้เช่าในห้องที่เลือก
        const roomTenants = tenants.filter(tenant => tenant.roomId === room.id && tenant.active);
        
        // หาข้อมูลประเภทห้อง
        const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
        
        if (roomTenants.length === 0) {
          toast.warning(`ห้อง ${room.roomNumber} ไม่มีผู้เช่าที่เปิดใช้งาน`);
          return;
        }
        
        if (!roomType) {
          toast.warning(`ห้อง ${room.roomNumber} ไม่พบข้อมูลประเภทห้อง`);
          return;
        }
        
        // สร้างรายการค่าใช้จ่าย
        const items = [
          {
            name: "ค่าเช่าห้อง",
            amount: roomType.rentFee,
            type: "RENT"
          }
        ];
        
        // คำนวณค่าน้ำ
        if (includeWater) {
          if (room.waterMeterStartUnit !== undefined && room.waterMeterEndUnit !== undefined) {
            const waterUnitsUsed = room.waterMeterEndUnit - room.waterMeterStartUnit;
            const waterFee = waterUnitsUsed * (dormitoryConfig?.waterFeePerUnit || 0);
            
            items.push({
              name: "ค่าน้ำ",
              amount: waterFee,
              type: "WATER",
              description: `${waterUnitsUsed} หน่วย (${room.waterMeterStartUnit}-${room.waterMeterEndUnit})`
            });
          } else {
            items.push({
              name: "ค่าน้ำเหมาจ่าย",
              amount: dormitoryConfig?.waterFeeFixedRate || 0,
              type: "WATER",
              description: "เหมาจ่าย"
            });
          }
        }
        
        // คำนวณค่าไฟ
        if (includeElectricity) {
          if (room.electricityMeterStartUnit !== undefined && room.electricityMeterEndUnit !== undefined) {
            const electricityUnitsUsed = room.electricityMeterEndUnit - room.electricityMeterStartUnit;
            const electricityFee = electricityUnitsUsed * (dormitoryConfig?.electricityFeePerUnit || 0);
            
            items.push({
              name: "ค่าไฟ",
              amount: electricityFee,
              type: "ELECTRICITY",
              description: `${electricityUnitsUsed} หน่วย (${room.electricityMeterStartUnit}-${room.electricityMeterEndUnit})`
            });
          } else {
            items.push({
              name: "ค่าไฟเหมาจ่าย",
              amount: dormitoryConfig?.electricityFeeFixedRate || 0,
              type: "ELECTRICITY",
              description: "เหมาจ่าย"
            });
          }
        }
        
        // เพิ่มค่าใช้จ่ายอื่นๆ
        otherFees.forEach(fee => {
          if (fee.name && fee.amount) {
            items.push({
              name: fee.name,
              amount: Number(fee.amount),
              type: "OTHER"
            });
          }
        });
        
        // คำนวณยอดรวม
        const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
        
        // เพิ่มข้อมูลบิลเข้า array
        createdBills.push({
          dormitoryId: dormitoryId,
          roomId: room.id,
          tenantId: roomTenants[0]?.id || null,
          billDate: new Date(),
          dueDate: dueDate,
          status: "UNPAID",
          billNumber: generateBillNumber(),
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
        });
      });
      
      // ใช้ createBills จาก billUtils.ts
      const result = await createBills(dormitoryId, createdBills as any, false);
      
      if (result.success) {
        toast.success(`สร้างบิลสำเร็จ ${result.data?.length || 0} รายการ`);
        onSuccess();
        onClose();
      } else {
        if (result.error === "มีบิลซ้ำในเดือนที่เลือก") {
          if (window.confirm(`${result.error} ต้องการสร้างบิลซ้ำหรือไม่?`)) {
            // สร้างบิลใหม่โดยบังคับสร้าง
            const forceResult = await createBills(dormitoryId, createdBills as any, true);
            
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>สร้างบิลแบบหลายรายการ</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="billDate">วันที่ออกบิล</Label>
                <DatePicker date={billDate} setDate={setBillDate} className="w-full" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dueDate">วันครบกำหนดชำระ</Label>
                <DatePicker date={dueDate} setDate={setDueDate} className="w-full" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRent"
                    checked={includeRent}
                    onCheckedChange={setIncludeRent}
                  />
                  <Label htmlFor="includeRent">รวมค่าเช่า</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeWater"
                    checked={includeWater}
                    onCheckedChange={setIncludeWater}
                  />
                  <Label htmlFor="includeWater">รวมค่าน้ำ</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeElectricity"
                    checked={includeElectricity}
                    onCheckedChange={setIncludeElectricity}
                  />
                  <Label htmlFor="includeElectricity">รวมค่าไฟ</Label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>ค่าใช้จ่ายอื่นๆ</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOtherFee}
                disabled={isLoading}
              >
                เพิ่มรายการ
              </Button>
            </div>
            
            {otherFees.map((fee, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="ชื่อรายการ"
                  value={fee.name}
                  onChange={(e) => updateOtherFee(index, "name", e.target.value)}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Input
                  type="number"
                  placeholder="จำนวนเงิน"
                  value={fee.amount}
                  onChange={(e) => updateOtherFee(index, "amount", Number(e.target.value))}
                  className="w-24"
                  min={0}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOtherFee(index)}
                  disabled={isLoading || otherFees.length === 1}
                >
                  ✕
                </Button>
              </div>
            ))}
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
            >
              {isLoading ? "กำลังสร้างบิล..." : "สร้างบิล"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 