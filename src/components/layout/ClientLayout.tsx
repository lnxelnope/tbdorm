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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white md:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-40 h-screen transition-transform md:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <Sidebar isCollapsed={!isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 transition-all duration-300",
          isSidebarOpen ? "md:ml-64" : "md:ml-16"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
} 