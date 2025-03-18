"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { db } from "@/lib/firebase/firebase";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Room {
  id: string;
  number: string;
  floor: string;
  status: string;
  type: {
    name: string;
    basePrice: number;
    additionalServices?: {
      name: string;
      price: number;
      description?: string;
    }[];
  };
  tenant?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  waterMeter?: {
    previous: number;
    current: number;
    lastUpdated?: any;
  };
  electricityMeter?: {
    previous: number;
    current: number;
    lastUpdated?: any;
  };
}

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormitoryId: string;
  room: Room;
}

export default function CreateBillModal({ isOpen, onClose, dormitoryId, room }: CreateBillModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() + 7))
  );
  const [includeRent, setIncludeRent] = useState(true);
  const [includeWater, setIncludeWater] = useState(true);
  const [includeElectricity, setIncludeElectricity] = useState(true);
  const [includeAdditionalServices, setIncludeAdditionalServices] = useState<{[key: string]: boolean}>({});
  const [waterRate, setWaterRate] = useState(18);
  const [electricityRate, setElectricityRate] = useState(8);
  const [note, setNote] = useState("");
  const [otherFees, setOtherFees] = useState<{ name: string; amount: number }[]>([
    { name: "", amount: 0 }
  ]);
  const [totalAmount, setTotalAmount] = useState(0);

  // ตั้งค่าเริ่มต้นสำหรับบริการเพิ่มเติม
  useEffect(() => {
    if (room.type?.additionalServices) {
      const initialState: {[key: string]: boolean} = {};
      room.type.additionalServices.forEach((service) => {
        initialState[service.name] = true;
      });
      setIncludeAdditionalServices(initialState);
    }
  }, [room]);

  // คำนวณยอดรวม
  useEffect(() => {
    let total = 0;

    // ค่าเช่า
    if (includeRent && room.type?.basePrice) {
      total += room.type.basePrice;
    }

    // ค่าบริการเพิ่มเติม
    if (room.type?.additionalServices) {
      room.type.additionalServices.forEach((service) => {
        if (includeAdditionalServices[service.name]) {
          total += service.price;
        }
      });
    }

    // ค่าน้ำ
    if (includeWater && room.waterMeter) {
      const waterUsage = room.waterMeter.current - (room.waterMeter.previous || 0);
      total += waterUsage * waterRate;
    }

    // ค่าไฟ
    if (includeElectricity && room.electricityMeter) {
      const electricityUsage = room.electricityMeter.current - (room.electricityMeter.previous || 0);
      total += electricityUsage * electricityRate;
    }

    // ค่าใช้จ่ายอื่นๆ
    otherFees.forEach((fee) => {
      if (fee.name && fee.amount > 0) {
        total += fee.amount;
      }
    });

    setTotalAmount(total);
  }, [includeRent, includeWater, includeElectricity, includeAdditionalServices, waterRate, electricityRate, otherFees, room]);

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

    if (!room.tenant) {
      toast.error("ห้องนี้ไม่มีผู้เช่า ไม่สามารถสร้างบิลได้");
      return;
    }

    try {
      setIsLoading(true);
      
      // คำนวณค่าใช้จ่าย
      const items = [];
      
      // ค่าเช่า
      if (includeRent && room.type?.basePrice) {
        items.push({
          name: "ค่าเช่าห้อง",
          amount: room.type.basePrice,
          quantity: 1,
          unit: "เดือน"
        });
      }
      
      // ค่าบริการเพิ่มเติม
      if (room.type?.additionalServices) {
        room.type.additionalServices.forEach((service) => {
          if (includeAdditionalServices[service.name]) {
            items.push({
              name: service.name,
              amount: service.price,
              quantity: 1,
              unit: "รายการ",
              description: service.description
            });
          }
        });
      }
      
      // ค่าน้ำ
      if (includeWater && room.waterMeter) {
        const waterUsage = room.waterMeter.current - (room.waterMeter.previous || 0);
        const waterAmount = waterUsage * waterRate;
        items.push({
          name: "ค่าน้ำ",
          amount: waterAmount,
          quantity: waterUsage,
          unit: "หน่วย",
          rate: waterRate,
          previous: room.waterMeter.previous,
          current: room.waterMeter.current
        });
      }
      
      // ค่าไฟ
      if (includeElectricity && room.electricityMeter) {
        const electricityUsage = room.electricityMeter.current - (room.electricityMeter.previous || 0);
        const electricityAmount = electricityUsage * electricityRate;
        items.push({
          name: "ค่าไฟ",
          amount: electricityAmount,
          quantity: electricityUsage,
          unit: "หน่วย",
          rate: electricityRate,
          previous: room.electricityMeter.previous,
          current: room.electricityMeter.current
        });
      }
      
      // ค่าใช้จ่ายอื่นๆ
      for (const fee of otherFees) {
        if (fee.name && fee.amount > 0) {
          items.push({
            name: fee.name,
            amount: fee.amount,
            quantity: 1,
            unit: "รายการ"
          });
        }
      }
      
      // สร้างบิล
      const billData = {
        dormitoryId,
        roomId: room.id,
        roomNumber: room.number,
        tenantId: room.tenant.id,
        tenantName: `${room.tenant.firstName} ${room.tenant.lastName}`,
        createdAt: Timestamp.now(),
        dueDate: Timestamp.fromDate(dueDate),
        items,
        totalAmount,
        paidAmount: 0,
        status: "pending",
        note
      };
      
      const billRef = await addDoc(collection(db, "bills"), billData);
      
      toast.success("สร้างบิลสำเร็จ");
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error creating bill:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>สร้างบิลสำหรับห้อง {room.number}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
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
                    <Label htmlFor="includeRent" className="cursor-pointer">ค่าเช่าห้อง ({room.type?.basePrice?.toLocaleString() || 0} บาท)</Label>
                  </div>
                  
                  {/* ค่าบริการเพิ่มเติม */}
                  {room.type?.additionalServices && room.type.additionalServices.length > 0 && (
                    <div className="ml-6 space-y-2 border-l-2 pl-4 border-gray-200">
                      <Label>บริการเพิ่มเติม</Label>
                      {room.type.additionalServices.map((service, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`service-${index}`}
                            checked={includeAdditionalServices[service.name] || false}
                            onCheckedChange={(checked) => 
                              setIncludeAdditionalServices({
                                ...includeAdditionalServices,
                                [service.name]: checked as boolean
                              })
                            }
                            disabled={isLoading}
                          />
                          <Label htmlFor={`service-${index}`} className="cursor-pointer">
                            {service.name} ({service.price.toLocaleString()} บาท)
                            {service.description && (
                              <span className="text-xs text-gray-500 block">{service.description}</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                  
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
                  
                  {includeWater && room.waterMeter && (
                    <div className="ml-6 text-sm text-gray-600">
                      <div>เลขมิเตอร์ก่อนหน้า: {room.waterMeter.previous || 0}</div>
                      <div>เลขมิเตอร์ปัจจุบัน: {room.waterMeter.current || 0}</div>
                      <div>หน่วยที่ใช้: {room.waterMeter.current - (room.waterMeter.previous || 0)} หน่วย</div>
                      <div>รวมเป็นเงิน: {((room.waterMeter.current - (room.waterMeter.previous || 0)) * waterRate).toLocaleString()} บาท</div>
                    </div>
                  )}
                  
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
                  
                  {includeElectricity && room.electricityMeter && (
                    <div className="ml-6 text-sm text-gray-600">
                      <div>เลขมิเตอร์ก่อนหน้า: {room.electricityMeter.previous || 0}</div>
                      <div>เลขมิเตอร์ปัจจุบัน: {room.electricityMeter.current || 0}</div>
                      <div>หน่วยที่ใช้: {room.electricityMeter.current - (room.electricityMeter.previous || 0)} หน่วย</div>
                      <div>รวมเป็นเงิน: {((room.electricityMeter.current - (room.electricityMeter.previous || 0)) * electricityRate).toLocaleString()} บาท</div>
                    </div>
                  )}
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
              
              <div className="space-y-2">
                <Label htmlFor="note">หมายเหตุ</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">สรุปรายการ</h3>
                  
                  <div className="space-y-4">
                    {includeRent && room.type?.basePrice && (
                      <div className="flex justify-between">
                        <span>ค่าเช่าห้อง</span>
                        <span>{room.type.basePrice.toLocaleString()} บาท</span>
                      </div>
                    )}
                    
                    {room.type?.additionalServices && room.type.additionalServices.length > 0 && (
                      <>
                        {room.type.additionalServices.map((service, index) => (
                          includeAdditionalServices[service.name] && (
                            <div key={index} className="flex justify-between">
                              <span>{service.name}</span>
                              <span>{service.price.toLocaleString()} บาท</span>
                            </div>
                          )
                        ))}
                      </>
                    )}
                    
                    {includeWater && room.waterMeter && (
                      <div className="flex justify-between">
                        <span>ค่าน้ำ ({room.waterMeter.current - (room.waterMeter.previous || 0)} หน่วย)</span>
                        <span>{((room.waterMeter.current - (room.waterMeter.previous || 0)) * waterRate).toLocaleString()} บาท</span>
                      </div>
                    )}
                    
                    {includeElectricity && room.electricityMeter && (
                      <div className="flex justify-between">
                        <span>ค่าไฟ ({room.electricityMeter.current - (room.electricityMeter.previous || 0)} หน่วย)</span>
                        <span>{((room.electricityMeter.current - (room.electricityMeter.previous || 0)) * electricityRate).toLocaleString()} บาท</span>
                      </div>
                    )}
                    
                    {otherFees.map((fee, index) => (
                      fee.name && fee.amount > 0 && (
                        <div key={index} className="flex justify-between">
                          <span>{fee.name}</span>
                          <span>{fee.amount.toLocaleString()} บาท</span>
                        </div>
                      )
                    ))}
                    
                    <Separator />
                    
                    <div className="flex justify-between font-semibold">
                      <span>ยอดรวมทั้งสิ้น</span>
                      <span>{totalAmount.toLocaleString()} บาท</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">ข้อมูลผู้เช่า</h3>
                <div className="text-sm">
                  <p>ชื่อ-นามสกุล: {room.tenant?.firstName} {room.tenant?.lastName}</p>
                  <p>เบอร์โทร: {room.tenant?.phone || "-"}</p>
                </div>
              </div>
            </div>
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