"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { Toaster } from "@/components/ui/toaster";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <ThemeProvider>
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <Sidebar 
          className="hidden md:flex md:flex-col" 
          isCollapsed={isCollapsed} 
          onToggle={handleToggle} 
        />
        
        {/* Mobile Navigation */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center h-16 px-4 bg-white border-b md:hidden">
          <MobileNav />
          <div className="ml-4 text-lg font-semibold">TB Dorm</div>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto pt-16 md:pt-0">
          {children}
        </main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
} 