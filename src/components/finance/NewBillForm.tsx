"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Dormitory } from "@/types/dormitory";
import { Plus, Minus } from "lucide-react";
import { calculateTotalPrice } from "@/app/dormitories/[id]/rooms/utils";

interface NewBillFormProps {
  dormitories: Dormitory[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface BillItem {
  type: string;
  amount: number;
  description?: string;
}

export default function NewBillForm({ dormitories, onSuccess, onCancel }: NewBillFormProps) {
  const [selectedDormitory, setSelectedDormitory] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<BillItem[]>([
    { type: "rent", amount: 0, description: "ค่าเช่าห้อง" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, { type: "", amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    const room = rooms[selectedRoom];
    if (!room || !config?.roomTypes) return 0;
    
    return calculateTotalPrice(room, config, tenant).total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDormitory || !roomNumber || !tenantName || !dueDate) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setIsSubmitting(true);
      const billRef = collection(db, `dormitories/${selectedDormitory}/bills`);
      await addDoc(billRef, {
        dormitoryId: selectedDormitory,
        roomNumber,
        tenantName,
        items,
        totalAmount: calculateTotal(),
        status: "pending",
        dueDate: Timestamp.fromDate(new Date(dueDate)),
        createdAt: Timestamp.now(),
      });

      onSuccess();
    } catch (error) {
      console.error("Error creating bill:", error);
      alert("เกิดข้อผิดพลาดในการสร้างบิล");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dormitory">หอพัก</Label>
          <select
            id="dormitory"
            value={selectedDormitory}
            onChange={(e) => setSelectedDormitory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            required
          >
            <option value="">เลือกหอพัก</option>
            {dormitories.map((dorm) => (
              <option key={dorm.id} value={dorm.id}>
                {dorm.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="roomNumber">เลขห้อง</Label>
          <Input
            id="roomNumber"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenantName">ชื่อผู้เช่า</Label>
          <Input
            id="tenantName"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">วันครบกำหนด</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">รายการ</h3>
          <Button type="button" onClick={addItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มรายการ
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-4">
              <Input
                placeholder="ประเภทรายการ"
                value={item.type}
                onChange={(e) => updateItem(index, "type", e.target.value)}
                required
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                placeholder="จำนวนเงิน"
                value={item.amount}
                onChange={(e) => updateItem(index, "amount", parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="col-span-4">
              <Input
                placeholder="รายละเอียด (ถ้ามี)"
                value={item.description || ""}
                onChange={(e) => updateItem(index, "description", e.target.value)}
              />
            </div>
            <div className="col-span-1">
              {index > 0 && (
                <Button
                  type="button"
                  onClick={() => removeItem(index)}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-end text-lg font-medium">
          ยอดรวม: {calculateTotal().toLocaleString()} บาท
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </form>
  );
} 