"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { Toaster } from "sonner";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
    <ThemeProvider>
      <div className="flex h-screen">
        <div className={cn(
          "fixed inset-y-0 z-50 transition-transform duration-300 md:relative md:translate-x-0",
          isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
        )}>
          <Sidebar 
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onMobileItemClick={() => setIsSidebarCollapsed(true)}
          />
        </div>
        <main className="flex-1 overflow-y-auto bg-gray-50 w-full">
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
} 