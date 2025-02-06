"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Receipt,
  Search,
  Bell,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  {
    title: "แผงควบคุม",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "ค้นหาผู้สมัคร",
    href: "/search",
    icon: Search,
  },
  {
    title: "จัดการหอพัก",
    href: "/dormitories",
    icon: Building2,
  },
  {
    title: "จัดการผู้เช่า",
    href: "/tenants",
    icon: Users,
  },
];

const billingNavItems: NavItem[] = [
  {
    title: "บิลและการชำระเงิน",
    href: "/bills",
    icon: Receipt,
  },
  {
    title: "จดมิเตอร์",
    href: "/meter-reading",
    icon: Zap,
  },
];

const maintenanceNavItems: NavItem[] = [
  {
    title: "แจ้งซ่อม",
    href: "/maintenance",
    icon: Wrench,
    badge: 3,
  },
  {
    title: "การแจ้งเตือน",
    href: "/notifications",
    icon: Bell,
    badge: 2,
  },
  {
    title: "ตรวจจับทุจริต",
    href: "/fraud-alerts",
    icon: AlertTriangle,
  },
];

const reportNavItems: NavItem[] = [
  {
    title: "รายงาน",
    href: "/reports",
    icon: FileText,
  },
];

const bottomNavItems: NavItem[] = [
  {
    title: "ตั้งค่า",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-xl relative group",
          isActive
            ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25"
            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
        )}
        title={isCollapsed ? item.title : undefined}
      >
        <div className={cn(
          "w-5 h-5 flex items-center justify-center transition-transform",
          isActive ? "transform-gpu" : "group-hover:scale-110"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {!isCollapsed && (
          <span className={cn(
            "transition-opacity duration-200",
            isActive ? "opacity-100" : "opacity-75 group-hover:opacity-100"
          )}>
            {item.title}
          </span>
        )}
        {!isCollapsed && item.badge && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center shadow-lg shadow-rose-500/25">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const NavSection = ({ items, title }: { items: NavItem[]; title?: string }) => (
    <div className="space-y-1">
      {title && !isCollapsed && (
        <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {items.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </div>
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-slate-950/50 backdrop-blur-xl border-r border-slate-800/60 transition-all duration-300 shrink-0",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
            G
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                G-JOB
              </span>
              <span className="text-xs text-slate-400">ระบบจัดการหอพัก</span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="p-4">
          <div className="relative group">
            <input
              type="text"
              placeholder="ค้นหา..."
              className="w-full bg-slate-900/50 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 border border-slate-800 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700 transition-all duration-200"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors duration-200" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto">
        <NavSection items={mainNavItems} title="หลัก" />
        <NavSection items={billingNavItems} title="การเงิน" />
        <NavSection items={maintenanceNavItems} title="การจัดการ" />
        <NavSection items={reportNavItems} title="รายงาน" />
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-slate-800/60">
        <NavSection items={bottomNavItems} />
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all duration-200"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>ย่อเมนู</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
} 