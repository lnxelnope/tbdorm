"use client";

import { DormitoryConfigProvider } from "@/lib/contexts/DormitoryConfigContext";
import { useEffect } from "react";

export default function DormitoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <DormitoryConfigProvider>
      {children}
    </DormitoryConfigProvider>
  );
} 