"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Zap, FileText } from "lucide-react";
import Link from "next/link";
import { getDormitory } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";

export default function ReportsPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [dormitory, setDormitory] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const result = await getDormitory(params.id);
        if (result.success && result.data) {
          setDormitory(result.data);
        }
      } catch (error) {
        console.error("Error loading dormitory:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">กำลังโหลด...</div>
      </div>
    );
  }

  const reports = [
    {
      id: "electricity",
      name: "รายงานการใช้ไฟฟ้า",
      description: "ดูสรุปการใช้ไฟฟ้า ค่าใช้จ่าย และการวิเคราะห์การใช้งาน",
      icon: Zap,
      href: `/dormitories/${params.id}/reports/electricity`,
    },
    // เพิ่มรายงานอื่นๆ ที่นี่
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link
          href={`/dormitories/${params.id}`}
          className="text-gray-500 hover:text-gray-700 mr-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">รายงาน</h1>
          {dormitory && (
            <p className="text-sm text-gray-500">{dormitory.name}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={report.href}
            className="block bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-6">
              <div className="flex items-center">
                <report.icon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {report.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {report.description}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 