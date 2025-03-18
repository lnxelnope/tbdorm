"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="th">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
          <div className="flex flex-col items-center max-w-md text-center">
            <h2 className="text-2xl font-bold mb-2">เกิดข้อผิดพลาดร้ายแรง</h2>
            <p className="text-gray-600 mb-6">
              ขออภัย เกิดข้อผิดพลาดร้ายแรงในระบบ โปรดลองใหม่อีกครั้ง
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </body>
    </html>
  );
} 