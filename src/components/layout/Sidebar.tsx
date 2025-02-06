"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Building2,
  Home,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Gauge,
  BarChart3,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: JSX.Element;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "หน้าแรก",
    icon: <Home className="w-5 h-5" />,
  },
  {
    href: "/tenants",
    label: "ผู้เช่า",
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: "/dormitories",
    label: "หอพัก",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    href: "/bills",
    label: "บิล/ใบแจ้งหนี้",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    href: "/meter-reading",
    label: "อ่านมิเตอร์",
    icon: <Gauge className="w-5 h-5" />,
  },
  {
    href: "/maintenance",
    label: "แจ้งซ่อม",
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    href: "/reports",
    label: "รายงาน",
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    href: "/settings",
    label: "ตั้งค่า",
    icon: <Settings className="w-5 h-5" />,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
          isActive
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:text-white hover:bg-slate-800"
        )}
      >
        {item.icon}
        {!isCollapsed && <span>{item.label}</span>}
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
    <div className="relative h-full">
      <nav className={cn(
        "h-full bg-slate-900 text-white transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!isCollapsed && (
              <h2 className="text-xl font-bold">TB Dorm</h2>
            )}
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className={cn(
            "absolute -right-4 top-24 z-50 bg-slate-800 text-white p-2 rounded-full shadow-lg hover:bg-slate-700 transition-all duration-300",
          )}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </nav>
    </div>
  );
} 