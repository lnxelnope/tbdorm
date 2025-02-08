"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getLineNotifyConfig, setLineNotifyConfig } from "@/lib/firebase/firebaseUtils";
import type { LineNotifyConfig } from "@/types/dormitory";

export default function LineNotifySettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<Omit<LineNotifyConfig, "id" | "createdAt" | "updatedAt">>({
    dormitoryId: params.id,
    accessToken: "",
    isActive: true,
    notificationSettings: {
      billCreated: true,
      billDueReminder: true,
      billOverdue: true,
      paymentReceived: true,
      utilityReading: true,
    },
  });

  const loadConfig = useCallback(async () => {
    try {
      const result = await getLineNotifyConfig(params.id);
      if (result.success && result.data) {
        setConfig({
          dormitoryId: params.id,
          accessToken: result.data.accessToken,
          isActive: result.data.isActive ?? true,
          notificationSettings: result.data.notificationSettings ?? {
            billCreated: true,
            billDueReminder: true,
            billOverdue: true,
            paymentReceived: true,
            utilityReading: true,
          },
        });
      }
    } catch (error) {
      console.error("Error loading LINE Notify config:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดการตั้งค่า LINE Notify");
    }
  }, [params.id]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const result = await setLineNotifyConfig(params.id, config);
      if (result.success) {
        toast.success("บันทึกการตั้งค่า LINE Notify เรียบร้อย");
        router.push(`/dormitories/${params.id}/settings`);
      }
    } catch (error) {
      console.error("Error updating LINE Notify config:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า LINE Notify");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <Link
            href={`/dormitories/${params.id}/settings`}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับ
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">ตั้งค่า LINE Notify</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Access Token
              </label>
              <input
                type="text"
                value={config.accessToken}
                onChange={(e) =>
                  setConfig({ ...config, accessToken: e.target.value })
                }
                placeholder="กรุณากรอก Access Token"
                className="mt-1"
              />
              <p className="mt-2 text-sm text-gray-500">
                คุณสามารถสร้าง Access Token ได้ที่{" "}
                <a
                  href="https://notify-bot.line.me/my/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  LINE Notify
                </a>
              </p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.isActive}
                  onChange={(e) =>
                    setConfig({ ...config, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">เปิดใช้งาน LINE Notify</span>
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">การแจ้งเตือน</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.notificationSettings.billCreated}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notificationSettings: {
                          ...config.notificationSettings,
                          billCreated: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">แจ้งเตือนเมื่อสร้างบิลใหม่</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.notificationSettings.billDueReminder}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notificationSettings: {
                          ...config.notificationSettings,
                          billDueReminder: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">แจ้งเตือนก่อนครบกำหนดชำระ</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.notificationSettings.billOverdue}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notificationSettings: {
                          ...config.notificationSettings,
                          billOverdue: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">แจ้งเตือนเมื่อเกินกำหนดชำระ</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.notificationSettings.paymentReceived}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notificationSettings: {
                          ...config.notificationSettings,
                          paymentReceived: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">แจ้งเตือนเมื่อได้รับการชำระเงิน</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.notificationSettings.utilityReading}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notificationSettings: {
                          ...config.notificationSettings,
                          utilityReading: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">แจ้งเตือนเมื่อมีการจดมิเตอร์</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 