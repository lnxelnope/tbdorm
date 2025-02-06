"use client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { Toaster } from "sonner";
import { useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { User } from "firebase/auth";

interface LayoutContentProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutContentProps) {
  const { user, loading, error } = useAuth();
  const [mounted] = useState(() => true);

  // แสดง loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center" role="status">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16" aria-label="กำลังโหลด">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-pulse"></div>
            <div className="absolute inset-2 rounded-full border-2 border-t-blue-500 animate-spin"></div>
          </div>
          <p className="text-blue-400 font-medium animate-pulse">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // แสดง error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4">
        <div className="bg-red-500/10 rounded-lg p-6 max-w-md w-full backdrop-blur-xl border border-red-500/20">
          <h2 className="text-red-500 text-lg font-semibold mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // ถ้ายังไม่ได้ login ให้แสดงเฉพาะ children
  if (!user) {
    return children;
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex">
      {/* Sidebar - Fixed position */}
      <div className="fixed inset-y-0 left-0 w-64 z-30">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-40">
          <Header />
        </div>
        
        {/* Content Area */}
        <main className="p-6">
          <div className="max-w-[1400px] mx-auto">
            {/* Content Container with Glass Effect */}
            <div className="relative min-h-[calc(100vh-8rem)]">
              {/* Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl"></div>
              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_85%)]"></div>
              
              {/* Content with Glass Effect */}
              <div className="relative backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent"></div>
                <div className="relative p-6">
                  {children}
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