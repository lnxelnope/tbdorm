"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useParams } from "next/navigation";
import { DormitoryConfig } from "@/types/dormitory";
import { getDormitory } from "@/lib/firebase/firebaseUtils";

interface DormitoryConfigContextType {
  config: DormitoryConfig | null;
  isLoading: boolean;
  error: string | null;
  refreshConfig: (dormId?: string) => Promise<void>;
}

const DormitoryConfigContext = createContext<DormitoryConfigContextType | undefined>(undefined);

export function DormitoryConfigProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const dormId = params?.id as string;
  
  const [config, setConfig] = useState<DormitoryConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshConfig = async (customDormId?: string) => {
    const targetDormId = customDormId || dormId;
    
    if (!targetDormId) {
      setError("ไม่พบรหัสหอพัก");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getDormitory(targetDormId);
      
      if (result.success && result.data?.config) {
        setConfig(result.data.config);
        console.log("โหลดข้อมูลการตั้งค่าหอพักสำเร็จ", result.data.config);
      } else {
        setError("ไม่สามารถโหลดข้อมูลการตั้งค่าหอพักได้");
        console.error("ไม่สามารถโหลดข้อมูลการตั้งค่าหอพักได้", result.error);
      }
    } catch (err) {
      setError(`เกิดข้อผิดพลาดในการโหลดข้อมูลการตั้งค่าหอพัก: ${err instanceof Error ? err.message : 'ไม่ทราบสาเหตุ'}`);
      console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลการตั้งค่าหอพัก:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (dormId) {
      refreshConfig();
    }
  }, [dormId]);

  return (
    <DormitoryConfigContext.Provider value={{ config, isLoading, error, refreshConfig }}>
      {children}
    </DormitoryConfigContext.Provider>
  );
}

export function useDormitoryConfig() {
  const context = useContext(DormitoryConfigContext);
  
  if (context === undefined) {
    throw new Error("useDormitoryConfig ต้องใช้งานภายใน DormitoryConfigProvider");
  }
  
  return context;
} 