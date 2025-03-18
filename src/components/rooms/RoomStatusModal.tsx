"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { db } from "@/lib/firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface RoomStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormitoryId: string;
  room: {
    id: string;
    status: string;
    tenant?: any;
  };
}

export default function RoomStatusModal({ isOpen, onClose, dormitoryId, room }: RoomStatusModalProps) {
  const router = useRouter();
  const [status, setStatus] = useState(room.status);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ตรวจสอบว่ามีผู้เช่าอยู่หรือไม่ ถ้ามีและกำลังจะตั้งเป็นห้องว่าง ให้แสดงคำเตือน
    if (room.tenant && status === "vacant") {
      setShowWarning(true);
      return;
    }
    
    await updateRoomStatus();
  };
  
  const updateRoomStatus = async () => {
    try {
      setIsLoading(true);
      
      const roomRef = doc(db, "dormitories", dormitoryId, "rooms", room.id);
      await updateDoc(roomRef, {
        status,
        statusNote: note,
        updatedAt: new Date()
      });
      
      toast.success("อัพเดตสถานะห้องพักสำเร็จ");
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error updating room status:", error);
      toast.error("เกิดข้อผิดพลาดในการอัพเดตสถานะห้องพัก");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เปลี่ยนสถานะห้องพัก</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>สถานะห้องพัก</Label>
              <RadioGroup
                value={status}
                onValueChange={setStatus}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vacant" id="vacant" />
                  <Label htmlFor="vacant" className="cursor-pointer">ว่าง</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="occupied" id="occupied" />
                  <Label htmlFor="occupied" className="cursor-pointer">มีผู้เช่า</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reserved" id="reserved" />
                  <Label htmlFor="reserved" className="cursor-pointer">จอง</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="maintenance" id="maintenance" />
                  <Label htmlFor="maintenance" className="cursor-pointer">ซ่อมบำรุง</Label>
                </div>
              </RadioGroup>
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
                {isLoading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คำเตือน</AlertDialogTitle>
            <AlertDialogDescription>
              ห้องนี้ยังมีผู้เช่าอยู่ ({room.tenant?.firstName} {room.tenant?.lastName}) 
              การตั้งค่าเป็นห้องว่างจะไม่ลบข้อมูลผู้เช่าออกโดยอัตโนมัติ 
              คุณควรย้ายผู้เช่าออกก่อนตั้งค่าเป็นห้องว่าง
              
              ต้องการดำเนินการต่อหรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={updateRoomStatus}>ดำเนินการต่อ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 