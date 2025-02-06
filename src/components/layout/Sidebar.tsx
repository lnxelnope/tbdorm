"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Home,
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
  MessageSquare,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    title: "แดชบอร์ด",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "หอพัก",
    href: "/dormitories",
    icon: Building2,
  },
  {
    title: "ผู้เช่า",
    href: "/tenants",
    icon: Users,
  },
  {
    title: "บิล",
    href: "/bills",
    icon: Receipt,
  },
  {
    title: "รายงาน",
    href: "/reports",
    icon: FileText,
  },
  {
    title: "จดมิเตอร์",
    href: "/meter-reading",
    icon: Gauge,
  },
  {
    title: "แจ้งซ่อม",
    href: "/maintenance",
    icon: Wrench,
  },
  {
    title: "ตรวจจับการทุจริต",
    href: "/fraud-detection",
    icon: AlertTriangle,
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  
  const pathname = usePathname();

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev: boolean) => !prev);
  };

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-xl relative group",
          isActive
            ? "text-white bg-white/10 shadow-sm"
            : "text-white hover:text-white hover:bg-white/10"
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
        <h3 className="px-3 text-xs font-semibold text-white/70 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {items.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </div>
  );

  return (
    <div className="relative flex">
      <aside
        className={cn(
          "flex flex-col h-screen bg-slate-950/50 backdrop-blur-xl border-r border-slate-800/60 transition-all duration-300 shrink-0 relative",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
              TB
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">
                  ธนบูรณ์กรุ๊ป OSS
                </span>
                <span className="text-xs font-medium text-white/70">ระบบจัดการหอพัก</span>
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
                className="w-full bg-slate-900/50 text-white text-sm rounded-xl pl-4 pr-10 py-2.5 border border-slate-800 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700 transition-all duration-200"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors duration-200" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto">
          <NavSection items={navItems} title="หลัก" />
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-800/60">
          <NavSection items={bottomNavItems} />
        </div>

        {/* Toggle Button - Moves with Sidebar */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "absolute -right-4 top-24 z-50 bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-all duration-300",
            "hover:scale-110 active:scale-95",
            isCollapsed ? "translate-x-0" : "translate-x-0"
          )}
          title={isCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </aside>
    </div>
  );
} 