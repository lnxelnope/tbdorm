import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { createBill } from '@/lib/firebase/billUtils';
import { Bill, BillItem } from '@/types/bill';
import { Room } from '@/types/dormitory';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  dormitoryId: string;
  room: Room & { tenantId?: string };
  onBillCreated: () => void;
}

export default function CreateBillModal({
  isOpen,
  onClose,
  dormitoryId,
  room,
  onBillCreated
}: CreateBillModalProps) {
  const [items, setItems] = useState<BillItem[]>([
    { type: 'rent', description: 'ค่าเช่าห้อง', amount: room.rent || 0 }
  ]);
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { type: 'other', description: '', amount: 0 }]);
  };

  const updateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      
      const billData: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'> = {
        dormitoryId,
        roomId: room.id,
        tenantId: room.tenantId || '',
        month,
        dueDate,
        status: 'pending',
        items,
        totalAmount,
        paidAmount: 0
      };

      const result = await createBill(billData);
      
      if (result.success) {
        toast.success('สร้างบิลสำเร็จ');
        onBillCreated();
        onClose();
      } else {
        throw new Error('ไม่สามารถสร้างบิลได้');
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างบิล');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg w-full max-w-2xl">
          <div className="p-6">
            <Dialog.Title className="text-lg font-semibold mb-4">
              สร้างบิลใหม่
            </Dialog.Title>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">วันครบกำหนดชำระ</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <select
                        value={item.type}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                          updateItem(index, 'type', e.target.value as BillItem['type'])
                        }
                        className="w-1/4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="rent">ค่าเช่า</option>
                        <option value="water">ค่าน้ำ</option>
                        <option value="electric">ค่าไฟ</option>
                        <option value="maintenance">ค่าซ่อมบำรุง</option>
                        <option value="other">อื่นๆ</option>
                      </select>
                      <input
                        placeholder="รายละเอียด"
                        value={item.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          updateItem(index, 'description', e.target.value)
                        }
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="จำนวนเงิน"
                        value={item.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          updateItem(index, 'amount', Number(e.target.value))
                        }
                        className="w-1/4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  เพิ่มรายการ
                </button>

                <div className="text-right text-lg font-semibold">
                  รวมทั้งสิ้น: ฿{items.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? 'กำลังสร้าง...' : 'สร้างบิล'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 