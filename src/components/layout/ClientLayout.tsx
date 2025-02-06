"use client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { Toaster } from "sonner";
import { useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";

interface LayoutContentProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutContentProps) {
  const { user, loading, error } = useAuth();
  const [mounted] = useState(() => true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // แสดง loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F1C] to-[#121827] flex items-center justify-center animate-in fade-in-50" role="status">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16" aria-label="กำลังโหลด">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
          </div>
          <p className="text-blue-400 font-medium animate-pulse">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // แสดง error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F1C] to-[#121827] flex items-center justify-center p-4 animate-in fade-in-50">
        <div className="bg-red-500/10 rounded-2xl p-8 max-w-md w-full backdrop-blur-xl border border-red-500/20 animate-in slide-in-from-bottom-4">
          <h2 className="text-red-500 text-lg font-semibold mb-3">เกิดข้อผิดพลาด</h2>
          <p className="text-red-400/90">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-red-500 text-white py-2.5 px-4 rounded-xl hover:bg-red-600 transition-colors animate-in zoom-in-75 font-medium"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // ถ้ายังไม่ได้ login ให้แสดงเฉพาะ children
  if (!user) {
    return <Slot>{children}</Slot>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1C] to-[#121827]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside 
          className={`fixed md:sticky top-0 left-0 z-30 h-screen transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'w-64' : 'w-20'} 
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          <Sidebar isCollapsed={!isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <Header 
            isSidebarOpen={isSidebarOpen} 
            onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
          />
          
          {/* Content Area */}
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Content Container with Glass Effect */}
              <div className="relative">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_85%)]"></div>
                
                {/* Content with Glass Effect */}
                <div className="relative rounded-3xl shadow-2xl overflow-hidden">
                  {/* Glass Background */}
                  <div className="absolute inset-0 backdrop-blur-xl bg-white/[0.02] border border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent"></div>
                  </div>
                  
                  {/* Actual Content */}
                  <div className="relative p-4 md:p-6 lg:p-8">
                    <Slot>{children}</Slot>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        theme="dark"
        toastOptions={{
          style: {
            background: '#0A0F1C',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  );
} 