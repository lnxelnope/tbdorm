"use client";

import {
  Building2,
  Home,
  Users,
  FileText,
  Wrench,
  AlertTriangle,
  BarChart3,
  Zap,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "แดชบอร์ด", href: "/", icon: Home },
  { name: "จัดการหอพัก", href: "/dormitories", icon: Building2 },
  { name: "จัดการผู้เช่า", href: "/tenants", icon: Users },
  { name: "บิลและการชำระเงิน", href: "/bills", icon: FileText },
  { name: "แจ้งซ่อม", href: "/maintenance", icon: Wrench },
  { name: "จดมิเตอร์", href: "/meter-reading", icon: Zap },
  { name: "ตรวจจับทุจริต", href: "/fraud-detection", icon: AlertTriangle },
  { name: "รายงาน", href: "/reports", icon: BarChart3 },
  { name: "ตั้งค่าระบบ", href: "/admin/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-4">
            <img
              className="h-8 w-auto"
              src="/next.svg"
              alt="ระบบจัดการหอพัก"
            />
          </div>
          <nav className="mt-5 flex-1 space-y-1 bg-white px-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive
                        ? "text-gray-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
} 