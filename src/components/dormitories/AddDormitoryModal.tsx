import { useState } from "react";
import { X } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { toast } from "sonner";

interface AddDormitoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDormitoryModal({
  isOpen,
  onClose,
  onSuccess,
}: AddDormitoryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    promptpayNumber: "",
    waterRate: 0,
    electricityRate: 0,
    lateFee: 0,
    paymentDueDay: 1,
  });

  const initialConfig = {
    roomTypes: {},
    additionalFees: {
      utilities: {
        water: {
          perPerson: null
        },
        electric: {
          unit: null
        }
      },
      items: [],
      floorRates: {}
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // สร้าง document ใหม่ใน collection dormitories
      const docRef = await addDoc(collection(db, 'dormitories'), {
        ...formData,
        status: 'active',
        config: initialConfig,
        facilities: [],
        images: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success('เพิ่มหอพักเรียบร้อยแล้ว');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding dormitory:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มหอพัก');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                เพิ่มหอพักใหม่
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500"
                onClick={onClose}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  ชื่อหอพัก
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700"
                >
                  ที่อยู่
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="promptpayNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  เลข PromptPay
                </label>
                <input
                  type="text"
                  id="promptpayNumber"
                  value={formData.promptpayNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, promptpayNumber: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="waterRate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    ค่าน้ำ (บาท/คน)
                  </label>
                  <input
                    type="number"
                    id="waterRate"
                    value={formData.waterRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        waterRate: Number(e.target.value),
                      })
                    }
                    min="0"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="electricityRate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    ค่าไฟ (บาท/หน่วย)
                  </label>
                  <input
                    type="number"
                    id="electricityRate"
                    value={formData.electricityRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        electricityRate: Number(e.target.value),
                      })
                    }
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="lateFee"
                    className="block text-sm font-medium text-gray-700"
                  >
                    ค่าปรับชำระล่าช้า (บาท)
                  </label>
                  <input
                    type="number"
                    id="lateFee"
                    value={formData.lateFee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lateFee: Number(e.target.value),
                      })
                    }
                    min="0"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="paymentDueDay"
                    className="block text-sm font-medium text-gray-700"
                  >
                    วันครบกำหนดชำระ
                  </label>
                  <input
                    type="number"
                    id="paymentDueDay"
                    value={formData.paymentDueDay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentDueDay: Number(e.target.value),
                      })
                    }
                    min="1"
                    max="31"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={onClose}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  เพิ่มหอพัก
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 