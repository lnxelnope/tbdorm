import { useState } from "react";
import { Tenant } from "@/types/dormitory";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { moveTenantToHistory } from "@/lib/firebase/firebaseUtils";

interface DeleteTenantModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteTenantModal({
  isOpen,
  tenant,
  onClose,
  onSuccess,
}: DeleteTenantModalProps) {
  const [deleteReason, setDeleteReason] = useState<'end_contract' | 'incorrect_data'>('end_contract');
  const [deleteNote, setDeleteNote] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !tenant) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = await moveTenantToHistory(
        tenant.dormitoryId,
        tenant.id,
        deleteReason,
        deleteNote
      );

      if (result.success) {
        toast.success('ลบผู้เช่าและบันทึกประวัติเรียบร้อยแล้ว');
        onSuccess();
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการลบผู้เช่า');
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('เกิดข้อผิดพลาดในการลบผู้เช่า');
    } finally {
      setIsDeleting(false);
      onClose();
      setDeleteNote('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium mb-4">ยืนยันการลบผู้เช่า</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              เหตุผลในการลบ
            </label>
            <select
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value as 'end_contract' | 'incorrect_data')}
              className="w-full rounded-md border border-gray-300 p-2"
            >
              <option value="end_contract">สิ้นสุดสัญญา</option>
              <option value="incorrect_data">ข้อมูลผิดพลาด</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หมายเหตุ (ถ้ามี)
            </label>
            <textarea
              value={deleteNote}
              onChange={(e) => setDeleteNote(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                  กำลังลบ...
                </>
              ) : (
                'ยืนยันการลบ'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 