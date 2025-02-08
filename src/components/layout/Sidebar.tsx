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
  MessageCircle,
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
    href: "/chat",
    label: "แชท AI",
    icon: <MessageCircle className="w-5 h-5" />,
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
  onMobileItemClick?: () => void;
}

export default function Sidebar({ isCollapsed, onToggle, onMobileItemClick }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href;

    return (
      <Link
        href={item.href}
        onClick={onMobileItemClick}
        className={cn(
          "flex items-center gap-2 text-sm font-medium rounded-lg transition-colors",
          isCollapsed ? "justify-center px-2" : "px-4",
          "py-2",
          isActive
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        )}
      >
        <div className={cn("min-w-[20px]", isCollapsed && "flex justify-center")}>
          {item.icon}
        </div>
        {!isCollapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const NavSection = ({ items, title }: { items: NavItem[]; title?: string }) => (
    <div className="space-y-1">
      {title && !isCollapsed && (
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
        "h-full bg-white text-gray-700 border-r border-gray-100 shadow-sm transition-all duration-300 relative",
        isCollapsed ? "w-16" : "w-64",
        "md:w-64"
      )}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {isCollapsed ? (
              <div className="flex items-center justify-center w-full">
                <h2 className="text-xl font-bold text-blue-600">TB</h2>
              </div>
            ) : (
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-blue-600">TB OSS</h2>
                <p className="text-sm text-gray-500">one stop service</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        <button
          onClick={onToggle}
          className={cn(
            "absolute -right-4 bottom-8 z-50 bg-white text-gray-700 p-2 rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-all duration-300",
            "hidden md:block"
          )}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </nav>
    </div>
  );
} 