import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getLatestMeterReading } from "@/lib/firebase/firebaseUtils"

export default function AddTenantModal({ 
  isOpen, 
  onClose,
  dormitoryId,
  roomId
}: { 
  isOpen: boolean; 
  onClose: () => void;
  dormitoryId: string;
  roomId: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialMeterReading, setInitialMeterReading] = useState<number>(0)
  console.log('Modal rendered, isOpen:', isOpen)

  useEffect(() => {
    const loadMeterReading = async () => {
      if (!dormitoryId || !roomId) return;

      try {
        const result = await getLatestMeterReading(dormitoryId, roomId, 'electric');
        if (result.success && result.data && 'currentReading' in result.data) {
          setInitialMeterReading((result.data as { currentReading: number }).currentReading);
        }
      } catch (error) {
        console.error('Error loading meter reading:', error);
      }
    };

    loadMeterReading();
  }, [dormitoryId, roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // ... existing submit logic ...
    } catch (error) {
      console.error('Error adding tenant:', error)
    } finally {
      setIsSubmitting(false)
      onClose()
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-gray-900">
                    เพิ่มผู้เช่า
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* ... existing form fields ... */}
                  
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                    >
                      {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 