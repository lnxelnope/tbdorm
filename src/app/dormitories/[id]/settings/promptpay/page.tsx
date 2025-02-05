"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PromptPayConfig } from "@/types/dormitory";
import {
  getPromptPayConfig,
  setPromptPayConfig,
} from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function PromptPaySettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "personal" as PromptPayConfig["type"],
    number: "",
    name: "",
    isActive: true,
  });

  useEffect(() => {
    loadConfig();
  }, [params.id]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const result = await getPromptPayConfig(params.id);
      if (result.success && result.data) {
        setFormData({
          type: result.data.type,
          number: result.data.number,
          name: result.data.name,
          isActive: result.data.isActive,
        });
      }
    } catch (error) {
      console.error("Error loading promptpay config:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.number.trim() || !formData.name.trim()) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // ตรวจสอบรูปแบบเบอร์โทรหรือเลขประจำตัวผู้เสียภาษี
    const numberPattern =
      formData.type === "personal"
        ? /^[0-9]{10}$/ // เบอร์โทร 10 หลัก
        : /^[0-9]{13}$/; // เลขประจำตัวผู้เสียภาษี 13 หลัก

    if (!numberPattern.test(formData.number)) {
      toast.error(
        formData.type === "personal"
          ? "กรุณากรอกเบอร์โทรให้ถูกต้อง (10 หลัก)"
          : "กรุณากรอกเลขประจำตัวผู้เสียภาษีให้ถูกต้อง (13 หลัก)"
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await setPromptPayConfig(params.id, {
        ...formData,
        dormitoryId: params.id,
      });
      if (result.success) {
        toast.success("บันทึกการตั้งค่าเรียบร้อย");
        router.push(`/dormitories/${params.id}/settings`);
      }
    } catch (error) {
      console.error("Error saving promptpay config:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link
          href={`/dormitories/${params.id}/settings`}
          className="text-gray-500 hover:text-gray-700 mr-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          ตั้งค่า PromptPay
        </h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ประเภท
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as PromptPayConfig["type"],
                    })
                  }
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="personal">บุคคลธรรมดา (เบอร์โทรศัพท์)</option>
                  <option value="corporate">
                    นิติบุคคล (เลขประจำตัวผู้เสียภาษี)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === "personal"
                    ? "เบอร์โทรศัพท์"
                    : "เลขประจำตัวผู้เสียภาษี"}
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({ ...formData, number: e.target.value })
                  }
                  placeholder={
                    formData.type === "personal"
                      ? "0812345678"
                      : "1234567890123"
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.type === "personal"
                    ? "กรอกเฉพาะตัวเลข 10 หลัก"
                    : "กรอกเฉพาะตัวเลข 13 หลัก"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อบัญชี
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    เปิดใช้งาน PromptPay
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href={`/dormitories/${params.id}/settings`}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 