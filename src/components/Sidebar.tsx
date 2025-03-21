"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  LayoutDashboard, 
  Building2, 
  Settings,
  History,
  Menu,
  X,
  AlertTriangle,
  Zap,
  FileText,
  Smartphone,
  Monitor,
  Receipt,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface MenuItem {
  name: string;
  href?: string;
  icon?: any;
  current?: boolean;
  children?: {
    name: string;
    href: string;
    current: boolean;
    icon?: any;
  }[];
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onMobileItemClick?: () => void;
}

export default function Sidebar({ isCollapsed, onToggle, onMobileItemClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileMode, toggleMobileMode } = useTheme();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    // เปิดเมนูย่อยอัตโนมัติถ้าอยู่ในหน้าย่อยนั้นๆ
    ...(['tenants', 'tenants/history', 'dormitories/[id]/tenant-history', 'dormitories/[id]/bill-history'].some(path => pathname?.includes(path)) ? ['ผู้เช่า', 'หอพัก'] : [])
  ]);

  const navigation: MenuItem[] = [
    {
      name: "แดชบอร์ด",
      href: "/dashboard",
      icon: LayoutDashboard,
      current: pathname === "/dashboard",
    },
    {
      name: "หอพัก",
      href: "/dormitories",
      icon: Building2,
      current: pathname?.includes('/dormitories') || pathname?.includes('/tenants') || pathname?.includes('/bills'),
      children: [
        {
          name: "รายการหอพัก",
          href: "/dormitories",
          current: pathname === "/dormitories",
          icon: Building2
        },
        {
          name: "รายชื่อผู้เช่า",
          href: "/tenants",
          current: pathname === "/tenants",
          icon: Users
        },
        {
          name: "ประวัติผู้เช่า",
          href: pathname?.includes('/dormitories/') ? `/dormitories/${pathname.split('/')[2]}/tenant-history` : "/tenants/history",
          current: pathname === "/tenants/history" || pathname?.includes('/tenant-history'),
          icon: History
        },
        {
          name: "บิล",
          href: pathname?.includes('/dormitories/') ? `/dormitories/${pathname.split('/')[2]}/bills` : "/bills",
          current: pathname === "/bills" || pathname?.includes('/bills'),
          icon: Receipt
        },
        {
          name: "ประวัติบิล",
          href: pathname?.includes('/dormitories/') ? `/dormitories/${pathname.split('/')[2]}/bill-history` : "/bills/history",
          current: pathname === "/bills/history" || pathname?.includes('/bill-history'),
          icon: History
        },
      ],
    },
    {
      name: "Line Chat",
      href: "/line-chat",
      icon: MessageCircle,
      current: pathname === "/line-chat",
    },
    {
      name: "ตั้งค่า",
      href: "/settings",
      icon: Settings,
      current: pathname === "/settings",
    },
  ];

  const handleMenuClick = (item: MenuItem, e: React.MouseEvent) => {
    if (item.children) {
      // ถ้ามีเมนูย่อย ให้นำทางไปที่หน้าแรกของเมนูย่อย
      if (item.href) {
        router.push(item.href);
      }
      // เปิด/ปิดเมนูย่อย
      toggleMenu(item.name);
    }
  };

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev: string[]) => 
      prev.includes(menuName) 
        ? prev.filter((name: string) => name !== menuName)
        : [...prev, menuName]
    );
  };

  return (
    <div className="h-full bg-white border-r">
      {/* Header with Toggle Button */}
      <div className="flex flex-col border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold text-gray-900">TB Dorm</h1>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 md:hidden"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Mode Toggle Button */}
        <button
          onClick={toggleMobileMode}
          className="flex items-center justify-center gap-2 px-4 py-2 mx-4 mb-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          {isMobileMode ? (
            <>
              <Monitor className="w-4 h-4" />
              <span>สลับเป็นโหมดคอมพิวเตอร์</span>
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4" />
              <span>สลับเป็นโหมดมือถือ</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.children ? (
              // Menu with submenu
              <>
                <button
                  onClick={(e) => handleMenuClick(item, e)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    item.current
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {item.icon && <item.icon className="mr-3 h-5 w-5 text-gray-400" />}
                  <span className="flex-1">{item.name}</span>
                  {expandedMenus.includes(item.name) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                {expandedMenus.includes(item.name) && (
                  <div className="ml-8 space-y-1 mt-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        onClick={onMobileItemClick}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                          child.current
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        {child.icon && <child.icon className="mr-3 h-5 w-5 text-gray-400" />}
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : item.href ? (
              // Regular menu item
              <Link
                href={item.href}
                onClick={onMobileItemClick}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  item.current
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.icon && <item.icon className="mr-3 h-5 w-5 text-gray-400" />}
                {item.name}
              </Link>
            ) : null}
          </div>
        ))}
      </nav>
    </div>
  );
} 