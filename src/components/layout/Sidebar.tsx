"use client";

import React from 'react';
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "../../lib/utils";
import {
  Building2,
  Home,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Bell,
  Send,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "หน้าแรก",
    icon: <Home className="w-5 h-5" />,
  },
  {
    href: "/dormitories",
    label: "หอพัก",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    href: "/line-chat",
    label: "Line Chat",
    icon: <MessageCircle className="w-5 h-5" />,
  },
  {
    href: "/line-notify-test",
    label: "Line Notify",
    icon: <Bell className="w-5 h-5" />,
  },
  {
    href: "/line-official-test",
    label: "Line Official",
    icon: <Send className="w-5 h-5" />,
  }
];

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onMobileItemClick?: () => void;
}

export function Sidebar({ 
  className, 
  isCollapsed = false, 
  onToggle = () => {}, 
  onMobileItemClick,
  ...props 
}: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  return (
    <div className={cn('w-64 bg-white border-r', className)} {...props}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b">
          <Link href="/" className="text-xl font-semibold">
            TB Dorm
          </Link>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileItemClick}
                className={cn(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                {item.icon}
                <span className={cn('ml-3', isCollapsed && 'hidden')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={onToggle}
          className={cn(
            "absolute -right-4 bottom-8 z-50 bg-white text-gray-700 p-2 rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-all duration-300",
            "hidden md:block"
          )}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </div>
  );
} 