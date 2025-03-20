import Link from "next/link";
import { Building2, Plus } from "lucide-react";

export function EmptyState() {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm border text-center my-8">
      <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4">
        <Building2 className="w-8 h-8 text-blue-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">ยังไม่มีหอพัก</h2>
      <p className="text-gray-500 mb-6">
        คุณยังไม่มีหอพักในระบบ เริ่มต้นโดยการเพิ่มหอพักแห่งแรกของคุณ
      </p>
      <Link href="/dormitories/new">
        <div className="inline-block">
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2"
          >
            <Plus size={18} />
            สร้างหอพัก
          </button>
        </div>
      </Link>
    </div>
  );
} 