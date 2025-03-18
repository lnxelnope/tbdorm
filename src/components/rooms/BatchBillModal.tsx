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
      
      // ใช้ข้อมูลห้องพักที่ส่งมาแทนการดึงข้อมูลใหม่
      const roomsData = selectedRooms;
      
      const createdBills = [];
      
      // สร้างบิลสำหรับแต่ละห้อง
      for (const room of roomsData) {
        const tenant = tenants.find(t => t.roomNumber === room.number);
        if (!tenant) {
          continue; // ข้ามห้องที่ไม่มีผู้เช่า
        }
        
        const roomType = roomTypes.find(rt => rt.id === room.roomType);
        if (!roomType) {
          continue; // ข้ามห้องที่ไม่มีข้อมูลประเภทห้อง
        }
        
        // คำนวณค่าใช้จ่าย
        let totalAmount = 0;
        const items = [];
        
        // ค่าเช่า
        if (includeRent && roomType.basePrice) {
          totalAmount += roomType.basePrice;
          items.push({
            name: "ค่าเช่าห้อง",
            type: "rent",
            amount: roomType.basePrice,
            description: `ค่าเช่าห้อง ${room.number}`,
            unitPrice: roomType.basePrice,
            units: 1
          });
        }
        
        // ค่าบริการเพิ่มเติม
        if (includeAdditionalServices && room.additionalServices && room.additionalServices.length > 0) {
          room.additionalServices.forEach(serviceId => {
            const service = dormitoryConfig.additionalFees?.items.find(item => item.id === serviceId);
            if (service) {
              items.push({
                name: service.name,
                type: "additional_fee",
                amount: service.amount,
                description: service.name,
                unitPrice: service.amount,
                units: 1
              });
            }
          });
        }
        
        // ค่าน้ำ
        if (includeWater && tenant.numberOfResidents && dormitoryConfig.additionalFees?.utilities?.water?.perPerson) {
          const waterAmount = tenant.numberOfResidents * dormitoryConfig.additionalFees.utilities.water.perPerson;
          items.push({
            name: "ค่าน้ำ",
            type: "water",
            amount: waterAmount,
            description: `ค่าน้ำ (${tenant.numberOfResidents} คน)`,
            unitPrice: dormitoryConfig.additionalFees.utilities.water.perPerson,
            units: tenant.numberOfResidents
          });
        }
        
        // ค่าไฟ
        if (includeElectricity && tenant.electricityUsage) {
          const unitsUsed = typeof tenant.electricityUsage === 'number' 
            ? tenant.electricityUsage 
            : tenant.electricityUsage.unitsUsed || 0;
          
          if (unitsUsed > 0 && dormitoryConfig.additionalFees?.utilities?.electric?.unit) {
            const electricAmount = unitsUsed * dormitoryConfig.additionalFees.utilities.electric.unit;
            items.push({
              name: "ค่าไฟฟ้า",
              type: "electric",
              amount: electricAmount,
              description: `ค่าไฟฟ้า (${unitsUsed} หน่วย)`,
              unitPrice: dormitoryConfig.additionalFees.utilities.electric.unit,
              units: unitsUsed
            });
          }
        }
        
        // ค่าใช้จ่ายอื่นๆ
        otherFees.forEach(fee => {
          if (fee.name && fee.amount > 0) {
            items.push({
              name: fee.name,
              type: "other",
              amount: fee.amount,
              description: fee.name,
              unitPrice: fee.amount,
              units: 1
            });
          }
        });
        
        // คำนวณยอดรวม
        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
        
        // ใช้วันที่ออกบิลจาก config ถ้ามี
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        
        // ตรวจสอบว่ามีการกำหนดวันครบกำหนดชำระใน config หรือไม่
        let billDueDate = dueDate;
        if (dormitoryConfig.billing?.dueDate) {
          // ถ้ามีการกำหนดวันครบกำหนดชำระใน config ให้ใช้วันนั้น
          const configDueDate = dormitoryConfig.billing.dueDate;
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, configDueDate);
          billDueDate = nextMonth;
        }
        
        return {
          dormitoryId: dormitoryId,
          roomId: room.id,
          roomNumber: room.number,
          tenantId: tenant.id,
          tenantName: tenant.name,
          month,
          year,
          dueDate: billDueDate,
          status: "pending" as const,
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
      }).filter(bill => bill !== null);
      
      // ใช้ createBills จาก billUtils.ts
      const result = await createBills(dormitoryId, billsToCreate as any, false);
      
      if (result.success) {
        toast.success(`สร้างบิลสำเร็จ ${result.data?.length || 0} รายการ`);
        onSuccess();
        onClose();
      } else {
        // ถ้าเป็นข้อผิดพลาดเกี่ยวกับบิลซ้ำ
        if (result.error?.toString().includes('มีบิลสำหรับห้อง')) {
          if (window.confirm(`${result.error} ต้องการสร้างบิลซ้ำหรือไม่?`)) {
            // สร้างบิลใหม่โดยบังคับสร้าง
            const forceResult = await createBills(dormitoryId, billsToCreate as any, true);
            
            if (forceResult.success) {
              toast.success(`สร้างบิลสำเร็จ ${forceResult.data?.length || 0} รายการ`);
              onSuccess();
              onClose();
            } else {
              toast.error(`เกิดข้อผิดพลาดในการสร้างบิล: ${forceResult.error}`);
            }
          }
        } else {
          toast.error(`เกิดข้อผิดพลาดในการสร้างบิล: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error generating bills:", error);
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
          <div>
            <Label htmlFor="dueDate">วันครบกำหนดชำระ</Label>
            <DatePicker
              id="dueDate"
              selected={dueDate}
              onSelect={setDueDate}
              disabled={isLoading}
              locale={th}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label>รายการที่ต้องการเรียกเก็บ</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeRent"
                  checked={includeRent}
                  onCheckedChange={(checked) => setIncludeRent(checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="includeRent" className="cursor-pointer">ค่าเช่าห้อง</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAdditionalServices"
                  checked={includeAdditionalServices}
                  onCheckedChange={(checked) => setIncludeAdditionalServices(checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="includeAdditionalServices" className="cursor-pointer">ค่าบริการเพิ่มเติม</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeWater"
                  checked={includeWater}
                  onCheckedChange={(checked) => setIncludeWater(checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="includeWater" className="cursor-pointer">ค่าน้ำ</Label>
                {includeWater && (
                  <div className="flex items-center ml-4">
                    <Input
                      type="number"
                      value={waterRate}
                      onChange={(e) => setWaterRate(Number(e.target.value))}
                      className="w-20"
                      min={0}
                      disabled={isLoading}
                    />
                    <span className="ml-2">บาท/หน่วย</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeElectricity"
                  checked={includeElectricity}
                  onCheckedChange={(checked) => setIncludeElectricity(checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="includeElectricity" className="cursor-pointer">ค่าไฟ</Label>
                {includeElectricity && (
                  <div className="flex items-center ml-4">
                    <Input
                      type="number"
                      value={electricityRate}
                      onChange={(e) => setElectricityRate(Number(e.target.value))}
                      className="w-20"
                      min={0}
                      disabled={isLoading}
                    />
                    <span className="ml-2">บาท/หน่วย</span>
                  </div>
                )}
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