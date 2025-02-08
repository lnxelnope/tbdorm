"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white text-gray-700 shadow-sm border border-gray-100 md:hidden hover:bg-gray-50"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex min-h-screen">
        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out md:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar 
            isCollapsed={false} 
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onMobileItemClick={() => setIsSidebarOpen(false)}
          />
        </aside>

        {/* Main Content */}
        <main 
          className={cn(
            "flex-1 transition-all duration-300 w-full",
            "px-4 py-16 md:p-6",
            "md:ml-64"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
} 