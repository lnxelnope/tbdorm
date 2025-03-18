"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="flex flex-col items-center max-w-md text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
        <p className="text-gray-600 mb-6">
          ขออภัย เกิดข้อผิดพลาดขึ้นในระบบ โปรดลองใหม่อีกครั้ง
        </p>
        <div className="flex gap-4">
          <button 
            onClick={reset} 
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            ลองใหม่
          </button>
          <button 
            onClick={() => window.location.href = "/"} 
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
} 