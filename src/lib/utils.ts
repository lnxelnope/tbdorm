import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ฟังก์ชันสำหรับจัดรูปแบบตัวเลขเป็นสกุลเงินบาท
 * @param amount จำนวนเงิน
 * @returns สตริงที่จัดรูปแบบเป็นสกุลเงินบาท
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('th-TH')} บาท`;
}
