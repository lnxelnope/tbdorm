import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Room } from '@/types/dormitory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateMeterReading } from '@/lib/firebase/firebaseUtils';

interface MeterReadingModalProps {
  room: Room | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MeterReadingModal({ room, onClose, onSuccess }: MeterReadingModalProps) {
  const [loading, setLoading] = useState(false);
  const [waterReading, setWaterReading] = useState('');
  const [electricReading, setElectricReading] = useState('');

  if (!room) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const waterValue = parseFloat(waterReading);
      const electricValue = parseFloat(electricReading);

      if (isNaN(waterValue) || isNaN(electricValue)) {
        throw new Error('กรุณากรอกตัวเลขที่ถูกต้อง');
      }

      await updateMeterReading(room.id, {
        water: {
          previous: room.waterMeter?.current || 0,
          current: waterValue,
        },
        electricity: {
          previous: room.electricityMeter?.current || 0,
          current: electricValue,
        },
      });

      toast.success('บันทึกค่าไฟและค่าน้ำเรียบร้อย');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating meter readings:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกค่าไฟและค่าน้ำ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!room} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกค่าไฟและค่าน้ำ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waterReading">ค่าน้ำ (หน่วย)</Label>
            <Input
              id="waterReading"
              type="number"
              value={waterReading}
              onChange={(e) => setWaterReading(e.target.value)}
              placeholder="กรอกค่าน้ำ"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="electricReading">ค่าไฟ (หน่วย)</Label>
            <Input
              id="electricReading"
              type="number"
              value={electricReading}
              onChange={(e) => setElectricReading(e.target.value)}
              placeholder="กรอกค่าไฟ"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 