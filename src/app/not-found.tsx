import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="flex flex-col items-center max-w-md text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">ไม่พบหน้าที่คุณต้องการ</h2>
        <p className="text-gray-600 mb-6">
          ขออภัย เราไม่พบหน้าที่คุณกำลังมองหา หน้านี้อาจถูกย้ายหรือลบไปแล้ว
        </p>
        <div className="flex gap-4">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            <Home className="h-4 w-4" />
            กลับสู่หน้าหลัก
          </Link>
          <Link 
            href="/dormitories" 
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            <Search className="h-4 w-4" />
            ดูรายการหอพัก
          </Link>
        </div>
      </div>
    </div>
  );
} 