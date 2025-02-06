"use client";

import { useState } from "react";
import { Settings, LogOut, User, Bell, Search, Menu, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { auth } from "@/lib/firebase/firebase";
import { signOut } from "@firebase/auth";
import { toast } from "sonner";

export default function Header() {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("ออกจากระบบสำเร็จ");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("เกิดข้อผิดพลาดในการออกจากระบบ");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5">
      <div className="h-16 backdrop-blur-2xl bg-[#0A0F1C]/80">
        <div className="flex h-full items-center justify-between px-4 md:px-8">
          {/* Mobile Menu Button */}
          <button
            className="p-2 text-white/50 hover:text-white md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>

          {/* Left side - Search */}
          <div className="flex-1 max-w-lg hidden md:block">
            <div className="relative group">
              <input
                type="text"
                placeholder="ค้นหา..."
                className="w-full h-10 pl-10 pr-4 text-sm text-white bg-white/5 border border-white/5 rounded-xl 
                focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 
                placeholder-white/30 transition-all duration-200"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 
                group-focus-within:text-blue-500 transition-colors duration-200" />
            </div>
          </div>

          {/* Right side */}
          {user && (
            <div className="flex items-center gap-3 md:gap-6">
              {/* Notification */}
              <button 
                className="relative p-2 text-white/50 hover:text-white transition-colors"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="w-5 h-5" />
                <span 
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-[#0A0F1C]"
                  aria-label="มีการแจ้งเตือนใหม่"
                ></span>
              </button>
              
              {/* User Menu */}
              <div className="flex items-center gap-2 md:gap-4 p-1.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3 pl-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                    flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white/70 hidden sm:inline-block">
                    {user.email}
                  </span>
                </div>
                
                <div className="flex items-center gap-0.5 pl-3 border-l border-white/5">
                  <Link
                    href="/admin/settings"
                    className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    aria-label="ตั้งค่า"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    aria-label="ออกจากระบบ"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/5">
            <div className="p-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  className="w-full h-10 pl-10 pr-4 text-sm text-white bg-white/5 border border-white/5 rounded-xl 
                  focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 
                  placeholder-white/30 transition-all duration-200"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 