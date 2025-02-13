"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogle, handleRedirectResult } from "@/lib/firebase/firebaseUtils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await handleRedirectResult();
        if (result) {
          toast.success("เข้าสู่ระบบสำเร็จ");
          const redirectUrl = searchParams.get('redirectUrl') || '/';
          router.push(redirectUrl);
        }
      } catch (error) {
        console.error("Error handling redirect:", error);
      }
    };

    checkRedirect();
  }, []);

  // ถ้า user login อยู่แล้ว และมี redirectUrl ให้ redirect ไปที่นั่น
  useEffect(() => {
    if (user) {
      const redirectUrl = searchParams.get('redirectUrl') || '/';
      router.push(redirectUrl);
    }
  }, [user, router, searchParams]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      // หมายเหตุ: ไม่ต้อง redirect ที่นี่ เพราะจะถูกจัดการโดย useEffect ด้านบน
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast.error("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">เข้าสู่ระบบ</CardTitle>
          <CardDescription>
            เข้าสู่ระบบเพื่อจัดการหอพักของคุณ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Image
                src="/google.svg"
                alt="Google"
                width={20}
                height={20}
                className="mr-2"
              />
            )}
            เข้าสู่ระบบด้วย Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 