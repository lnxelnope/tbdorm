"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-3xl font-bold mb-6 text-center">ยินดีต้อนรับสู่ระบบจัดการหอพัก TB Dorm</h1>
      
      <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl">
        ระบบจัดการหอพักที่ช่วยให้คุณบริหารจัดการหอพักได้อย่างมีประสิทธิภาพ
      </p>
      
      <Button 
        size="lg"
        onClick={() => router.push("/dormitories")}
        className="px-8"
      >
        <Building2 className="h-5 w-5 mr-2" />
        เข้าสู่ระบบจัดการหอพัก
      </Button>
    </div>
  );
}
