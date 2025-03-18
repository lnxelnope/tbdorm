"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { db } from "@/lib/firebase/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, FileText, Edit, Trash2, Home } from "lucide-react";
import RoomStatusModal from "./RoomStatusModal";
import TenantModal from "./TenantModal";
import MeterReadingModal from "./MeterReadingModal";
import CreateBillModal from "./CreateBillModal";
import BatchBillModal from "./BatchBillModal";

interface Room {
  id: string;
  number: string;
  floor: string;
  status: string;
  type: {
    name: string;
    basePrice: number;
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

interface RoomsTableProps {
  dormitoryId: string;
  rooms: Room[];
}

export default function RoomsTable({ dormitoryId, rooms }: RoomsTableProps) {
  const router = useRouter();
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [roomForStatus, setRoomForStatus] = useState<Room | null>(null);
  const [roomForTenant, setRoomForTenant] = useState<Room | null>(null);
  const [roomForMeter, setRoomForMeter] = useState<Room | null>(null);
  const [roomForBill, setRoomForBill] = useState<Room | null>(null);
  const [showBatchBillModal, setShowBatchBillModal] = useState(false);

  const handleSelectRoom = (roomId: string) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRooms.length === rooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(rooms.map((room) => room.id));
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;

    try {
      await deleteDoc(doc(db, "dormitories", dormitoryId, "rooms", roomToDelete.id));
      toast.success("ลบห้องพักสำเร็จ");
      router.refresh();
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("เกิดข้อผิดพลาดในการลบห้องพัก");
    } finally {
      setRoomToDelete(null);
    }
  };

  const getRoomStatusBadge = (status: string) => {
    switch (status) {
      case "vacant":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">ว่าง</Badge>;
      case "occupied":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">มีผู้เช่า</Badge>;
      case "reserved":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">จอง</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">ซ่อมบำรุง</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      return format(date.toDate(), "d MMM yyyy", { locale: th });
    } catch (error) {
      return "-";
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBatchBillModal(true)}
            disabled={selectedRooms.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            สร้างบิลแบบหลายรายการ ({selectedRooms.length})
          </Button>
        </div>
        <Link href={`/dormitories/${dormitoryId}/rooms/new`}>
          <Button size="sm">
            <Home className="h-4 w-4 mr-2" />
            เพิ่มห้องพัก
          </Button>
        </Link>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRooms.length === rooms.length && rooms.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>ห้อง</TableHead>
              <TableHead>ชั้น</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>ราคา</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>ผู้เช่า</TableHead>
              <TableHead>มิเตอร์น้ำ</TableHead>
              <TableHead>มิเตอร์ไฟ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  ไม่พบข้อมูลห้องพัก
                </TableCell>
              </TableRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRooms.includes(room.id)}
                      onCheckedChange={() => handleSelectRoom(room.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{room.number}</TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell>{room.type?.name || "-"}</TableCell>
                  <TableCell>{room.type?.basePrice?.toLocaleString() || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRoomStatusBadge(room.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setRoomForStatus(room)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {room.tenant ? (
                      <div className="flex items-center gap-2">
                        <span>{room.tenant.firstName} {room.tenant.lastName}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setRoomForTenant(room)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRoomForTenant(room)}
                      >
                        เพิ่มผู้เช่า
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">ปัจจุบัน: {room.waterMeter?.current || 0}</span>
                      <span className="text-xs text-gray-500">ก่อนหน้า: {room.waterMeter?.previous || 0}</span>
                      <span className="text-xs text-gray-500">
                        อัพเดตล่าสุด: {formatDate(room.waterMeter?.lastUpdated)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">ปัจจุบัน: {room.electricityMeter?.current || 0}</span>
                      <span className="text-xs text-gray-500">ก่อนหน้า: {room.electricityMeter?.previous || 0}</span>
                      <span className="text-xs text-gray-500">
                        อัพเดตล่าสุด: {formatDate(room.electricityMeter?.lastUpdated)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">เมนู</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setRoomForMeter(room)}>
                          อ่านมิเตอร์
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRoomForBill(room)}>
                          สร้างบิล
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dormitories/${dormitoryId}/rooms/${room.id}/edit`}>
                            แก้ไขข้อมูลห้อง
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setRoomToDelete(room)}
                        >
                          ลบห้อง
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบห้องพัก</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบห้องพัก {roomToDelete?.number} ใช่หรือไม่? การกระทำนี้ไม่สามารถเปลี่ยนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom} className="bg-red-600 hover:bg-red-700">
              ลบห้องพัก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Room Status Modal */}
      {roomForStatus && (
        <RoomStatusModal
          isOpen={!!roomForStatus}
          onClose={() => setRoomForStatus(null)}
          dormitoryId={dormitoryId}
          room={roomForStatus}
        />
      )}

      {/* Tenant Modal */}
      {roomForTenant && (
        <TenantModal
          isOpen={!!roomForTenant}
          onClose={() => setRoomForTenant(null)}
          dormitoryId={dormitoryId}
          room={roomForTenant}
        />
      )}

      {/* Meter Reading Modal */}
      {roomForMeter && (
        <MeterReadingModal
          isOpen={!!roomForMeter}
          onClose={() => setRoomForMeter(null)}
          dormitoryId={dormitoryId}
          room={roomForMeter}
        />
      )}

      {/* Create Bill Modal */}
      {roomForBill && (
        <CreateBillModal
          isOpen={!!roomForBill}
          onClose={() => setRoomForBill(null)}
          dormitoryId={dormitoryId}
          room={roomForBill}
        />
      )}

      {/* Batch Bill Modal */}
      {showBatchBillModal && (
        <BatchBillModal
          isOpen={showBatchBillModal}
          onClose={() => setShowBatchBillModal(false)}
          dormitoryId={dormitoryId}
          selectedRooms={selectedRooms}
        />
      )}
    </>
  );
} 