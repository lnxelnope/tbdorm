import React from 'react';
import { Room } from '@/types/dormitory';
import { Tenant } from '@/types/tenant';
import { X } from 'lucide-react';

// กำหนด interface สำหรับผลลัพธ์จาก calculateTotalPrice
export interface TotalPriceResult {
  total: number;
  breakdown: {
    basePrice: number;
    floorRate: number;
    additionalServices: number;
    specialItems: number;
    water: number;
    electricity: number;
  };
}

interface RentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  tenant: Tenant | undefined;
  priceDetails: TotalPriceResult;
  roomTypeName: string;
}

export default function RentDetailsModal({ isOpen, onClose, room, tenant, priceDetails, roomTypeName }: RentDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">รายละเอียดค่าเช่า</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">ห้อง: {room.number}</p>
          <p className="text-sm text-gray-600 mb-2">ประเภทห้อง: {roomTypeName}</p>
          {tenant && <p className="text-sm text-gray-600 mb-4">ผู้เช่า: {tenant.name}</p>}
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-sm">ค่าห้องพื้นฐาน:</span>
            <span className="text-sm font-medium">{priceDetails.breakdown.basePrice.toLocaleString()} บาท</span>
          </div>
          
          {priceDetails.breakdown.floorRate > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">ค่าส่วนเพิ่มตามชั้น:</span>
              <span className="text-sm font-medium">{priceDetails.breakdown.floorRate.toLocaleString()} บาท</span>
            </div>
          )}
          
          {priceDetails.breakdown.additionalServices > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">ค่าบริการเพิ่มเติม:</span>
              <span className="text-sm font-medium">{priceDetails.breakdown.additionalServices.toLocaleString()} บาท</span>
            </div>
          )}
          
          {priceDetails.breakdown.specialItems > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">รายการพิเศษ:</span>
              <span className="text-sm font-medium">{priceDetails.breakdown.specialItems.toLocaleString()} บาท</span>
            </div>
          )}
          
          {tenant?.specialItems && tenant.specialItems.length > 0 && (
            <div className="ml-4 mt-1 mb-1">
              {tenant.specialItems.map((item, index) => {
                // ตรวจสอบว่ารายการนี้ยังอยู่ในช่วงที่ต้องจ่ายหรือไม่
                const isActive = item.duration === 0 || // ไม่มีกำหนด
                                (item.remainingBillingCycles !== undefined && item.remainingBillingCycles > 0); // ยังเหลือรอบบิลที่ต้องจ่าย
                
                if (isActive) {
                  return (
                    <div key={index} className="flex justify-between text-xs text-gray-600">
                      <span>{item.name}</span>
                      <span className="flex items-center">
                        {item.amount.toLocaleString()} บาท
                        {item.duration > 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({item.remainingBillingCycles}/{item.duration} รอบ)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
          
          {priceDetails.breakdown.water > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">ค่าน้ำ:</span>
              <span className="text-sm font-medium">{priceDetails.breakdown.water.toLocaleString()} บาท</span>
            </div>
          )}
          
          {priceDetails.breakdown.electricity > 0 && (
            <div className="flex justify-between">
              <span className="text-sm">ค่าไฟฟ้า:</span>
              <span className="text-sm font-medium">{priceDetails.breakdown.electricity.toLocaleString()} บาท</span>
            </div>
          )}
          
          <div className="border-t pt-2 mt-2 flex justify-between font-medium">
            <span>รวมทั้งหมด:</span>
            <span>{priceDetails.total.toLocaleString()} บาท</span>
          </div>
        </div>
      </div>
    </div>
  );
} 