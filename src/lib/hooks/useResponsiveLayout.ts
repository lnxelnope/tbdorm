"use client";

import { useTheme } from "@/lib/contexts/ThemeContext";
import { useEffect, useState } from "react";

export function useResponsiveLayout() {
  const { isMobileMode } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      if (isMobileMode) {
        setIsMobile(true);
        return;
      }
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [isMobileMode]);

  return {
    isMobile,
    containerClass: isMobile ? "px-4 py-4" : "px-8 py-6",
    gridClass: isMobile ? "grid-cols-1 gap-4" : "grid-cols-3 gap-6",
    cardClass: isMobile ? "p-4" : "p-6",
    buttonClass: isMobile ? "text-sm px-3 py-1.5" : "px-4 py-2",
    inputClass: isMobile ? "text-sm p-2" : "p-3",
    modalClass: isMobile ? "p-4 max-w-[90%]" : "p-6 max-w-2xl",
    tableClass: isMobile ? "text-sm" : "text-base",
    fontSize: isMobile ? "text-sm" : "text-base",
  };
} 