"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Room } from "@/types/dormitory";
import { Tenant } from "@/types/tenant";
import { calculateTotalPrice } from "@/app/dormitories/[id]/rooms/utils";
import { createBill } from "@/lib/firebase/billUtils";
import { updateRoomStatus, getDormitory } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface BillPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  tenant: Tenant;
  dormitoryId: string;
  onBillCreated?: () => void;
}

export default function BillPreviewModal({
  isOpen,
  onClose,
  room,
  tenant,
  dormitoryId,
  onBillCreated
}: BillPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  
  // คำนวณค่าเช่าและรายละเอียดอื่นๆ
  const [dormitoryConfig, setDormitoryConfig] = useState<any>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  // โหลดข้อมูล dormitoryConfig
  useEffect(() => {
    const fetchDormitoryConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const result = await getDormitory(dormitoryId);
        if (result.success && result.data) {
          setDormitoryConfig({
            roomTypes: result.data.config?.roomTypes || {},
            additionalFees: {
              utilities: {
                water: {
                  perPerson: result.data.config?.additionalFees?.utilities?.water?.perPerson ?? null,
                },
                electric: {
                  unit: result.data.config?.additionalFees?.utilities?.electric?.unit ?? null,
                },
              },
              items: result.data.config?.additionalFees?.items || [],
              floorRates: result.data.config?.additionalFees?.floorRates || {}
            },
          });
          
          // เก็บข้อมูลรูปแบบบิลไว้ใช้ในการแสดงผล
          setBillTemplate(result.data.billTemplate || {});
        }
      } catch (error) {
        console.error("Error fetching dormitory config:", error);
      } finally {
        setIsLoadingConfig(false);
      }
    };
    
    fetchDormitoryConfig();
  }, [dormitoryId]);
  
  // เพิ่ม state สำหรับเก็บข้อมูลรูปแบบบิล
  const [billTemplate, setBillTemplate] = useState<any>({});
  
  // คำนวณค่าเช่าเมื่อ dormitoryConfig พร้อม
  const priceDetails = useMemo(() => {
    if (!dormitoryConfig || isLoadingConfig) {
      return {
        total: 0,
        breakdown: {
          basePrice: 0,
          floorRate: 0,
          additionalServices: 0,
          specialItems: 0,
          water: 0,
          electric: 0
        }
      };
    }
    return calculateTotalPrice(room, dormitoryConfig, tenant);
  }, [room, dormitoryConfig, tenant, isLoadingConfig]);
  
  // สร้างวันที่ครบกำหนดชำระ (30 วันจากวันนี้)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  
  const handleCreateBill = async () => {
    try {
      setIsLoading(true);
      
      // สร้างรายการสำหรับบิล
      const billItems = [
        {
          name: "ค่าเช่าห้อง",
          type: "rent" as const,
          amount: priceDetails.breakdown.basePrice,
          description: `ค่าเช่าห้องพักประจำเดือน ${month}/${year}`
        }
      ];
      
      // เพิ่มค่าบริการเพิ่มเติมถ้ามี
      if (priceDetails.breakdown.floorRate > 0) {
        billItems.push({
          name: "ค่าบริการเพิ่มเติมตามชั้น",
          type: "other" as const,
          amount: priceDetails.breakdown.floorRate,
          description: `ค่าบริการเพิ่มตามชั้น ${room.floor}`
        });
      }
      
      // เพิ่มค่าบริการพิเศษถ้ามี
      if (room.additionalServices && room.additionalServices.length > 0) {
        room.additionalServices.forEach(service => {
          if (typeof service === 'object' && service.name && service.amount) {
            billItems.push({
              name: service.name,
              type: "other" as const,
              amount: service.amount,
              description: `บริการเพิ่มเติม: ${service.name}`
            });
          }
        });
      }
      
      // เพิ่มรายการพิเศษถ้ามี
      if (room.specialItems && room.specialItems.length > 0) {
        room.specialItems.forEach(item => {
          // ตรวจสอบว่ารายการยังใช้งานอยู่หรือไม่
          const isActive = item.duration === 'once' || 
            (item.remainingBillingCycles !== undefined && item.remainingBillingCycles > 0);
            
          if (isActive) {
            billItems.push({
              name: item.name,
              type: "other" as const,
              amount: item.amount,
              description: `รายการพิเศษ: ${item.name}`
            });
          }
        });
      }
      
      // สร้างข้อมูลบิล
      const billData = {
        dormitoryId,
        roomNumber: room.number,
        tenantId: tenant.id,
        tenantName: tenant.name,
        month,
        year,
        dueDate,
        status: 'pending' as const,
        items: billItems,
        totalAmount: priceDetails.total,
        paidAmount: 0,
        remainingAmount: priceDetails.total,
        payments: [],
        notificationsSent: {
          initial: false,
          reminder: false,
          overdue: false
        }
      };
      
      // เรียกใช้ API สร้างบิล
      const result = await createBill(dormitoryId, billData);
      
      if (result.success) {
        // อัพเดทสถานะห้องเป็น "pending_payment"
        const updateResult = await updateRoomStatus(dormitoryId, room.id, 'pending_payment');
        
        if (updateResult.success) {
          toast.success("สร้างบิลเรียบร้อยแล้ว");
          onClose();
          
          // เรียกใช้ callback function onBillCreated (ถ้ามี) เพื่อให้ parent component รีเซ็ตค่า selectedRoom
          if (onBillCreated) {
            onBillCreated();
          }
          
          // รอให้ modal ปิดก่อนแล้วค่อย refresh หน้า
          setTimeout(() => {
            router.refresh();
          }, 100);
        } else {
          toast.error("สร้างบิลสำเร็จแต่ไม่สามารถอัพเดทสถานะห้องได้");
        }
      } else {
        toast.error(result.error || "เกิดข้อผิดพลาดในการสร้างบิล");
      }
    } catch (error) {
      console.error("Error creating bill:", error);
      toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>ตัวอย่างบิล - ห้อง {room.number}</DialogTitle>
        </DialogHeader>
        
        {isLoadingConfig ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            <p className="ml-2">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex justify-between mb-6">
                <div className="flex items-start">
                  {billTemplate.companyLogo && (
                    <div className="mr-4">
                      <Image
                        src={billTemplate.companyLogo}
                        alt="Company Logo"
                        width={100}
                        height={50}
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold">{billTemplate.companyName || "ชื่อหอพัก"}</h3>
                    <p className="text-gray-600 text-sm">{billTemplate.companyAddress || "ที่อยู่หอพัก"}</p>
                    {billTemplate.companyPhone && <p className="text-gray-600 text-sm">โทร: {billTemplate.companyPhone}</p>}
                    {billTemplate.companyEmail && <p className="text-gray-600 text-sm">อีเมล: {billTemplate.companyEmail}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">ใบแจ้งค่าเช่า</p>
                  <p className="text-gray-600">ประจำเดือน {month}/{year}</p>
                  <p className="font-medium">วันที่ออกบิล: {currentDate.toLocaleDateString('th-TH')}</p>
                  <p className="font-medium">กำหนดชำระ: {dueDate.toLocaleDateString('th-TH')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium mb-1">ข้อมูลผู้เช่า</h4>
                  <p>{tenant.name}</p>
                  <p>ห้อง {room.number}</p>
                  <p>โทร: {tenant.phone}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">ข้อมูลการชำระเงิน</h4>
                  {billTemplate.bankName && <p>ธนาคาร: {billTemplate.bankName}</p>}
                  {billTemplate.accountNumber && <p>เลขที่บัญชี: {billTemplate.accountNumber}</p>}
                  {billTemplate.accountName && <p>ชื่อบัญชี: {billTemplate.accountName}</p>}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">รายละเอียดค่าใช้จ่าย</h4>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">รายการ</th>
                      <th className="px-4 py-2 text-right">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2">ค่าเช่าห้อง</td>
                      <td className="px-4 py-2 text-right">{priceDetails.breakdown.basePrice.toLocaleString()} บาท</td>
                    </tr>
                    
                    {priceDetails.breakdown.floorRate > 0 && (
                      <tr>
                        <td className="px-4 py-2">ค่าบริการเพิ่มเติมตามชั้น</td>
                        <td className="px-4 py-2 text-right">{priceDetails.breakdown.floorRate.toLocaleString()} บาท</td>
                      </tr>
                    )}
                    
                    {room.additionalServices && room.additionalServices.map((service, index) => (
                      <tr key={`service-${index}`}>
                        <td className="px-4 py-2">{service.name}</td>
                        <td className="px-4 py-2 text-right">{(service.amount || 0).toLocaleString()} บาท</td>
                      </tr>
                    ))}
                    
                    {room.specialItems && room.specialItems.map((item, index) => {
                      // ตรวจสอบว่ารายการยังใช้งานอยู่หรือไม่
                      const isActive = item.duration === 'once' || 
                        (item.remainingBillingCycles !== undefined && item.remainingBillingCycles > 0);
                          
                      if (isActive) {
                        return (
                          <tr key={`special-${index}`}>
                            <td className="px-4 py-2">{item.name}</td>
                            <td className="px-4 py-2 text-right">{(item.amount || 0).toLocaleString()} บาท</td>
                          </tr>
                        );
                      }
                      return null;
                    })}
                    
                    <tr className="font-bold bg-gray-50">
                      <td className="px-4 py-2">รวมทั้งสิ้น</td>
                      <td className="px-4 py-2 text-right">{priceDetails.total.toLocaleString()} บาท</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm text-gray-600">
                  {billTemplate.additionalNotes && (
                    <div className="mb-2">
                      <p className="font-medium">หมายเหตุ:</p>
                      <p>{billTemplate.additionalNotes}</p>
                    </div>
                  )}
                  {billTemplate.footerText && <p className="mt-4">{billTemplate.footerText}</p>}
                </div>
                <div className="flex justify-center">
                  {billTemplate.qrCodeUrl && (
                    <div className="text-center">
                      <p className="text-sm font-medium mb-2">สแกนเพื่อชำระเงิน</p>
                      <Image
                        src={billTemplate.qrCodeUrl}
                        alt="QR Code"
                        width={120}
                        height={120}
                        className="object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-500 text-center">
              <p>หากต้องการแก้ไขรูปแบบบิล สามารถทำได้ที่หน้า <Link href={`/dormitories/${dormitoryId}/bill-template`} className="text-blue-500 hover:underline">ตั้งค่ารูปแบบบิล</Link></p>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button 
            onClick={handleCreateBill} 
            disabled={isLoading || isLoadingConfig}
          >
            {isLoading ? "กำลังสร้างบิล..." : "สร้างบิล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 