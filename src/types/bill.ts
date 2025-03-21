export interface Bill {
  id: string;
  dormitoryId: string;
  tenantId: string;
  roomId: string;
  month: number;
  year: number;
  dueDate: string;
  items: BillItem[];
  status: "pending" | "paid" | "overdue" | "partially_paid";
  totalAmount: number;
  remainingAmount: number;
  paidAmount: number;
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface BillItem {
  name: string;
  amount: number;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  utilityReading?: {
    previousReading: number;
    currentReading: number;
    unitsUsed: number;
  };
}

export interface MeterReading {
  id: string;
  dormitoryId: string;
  roomId: string;
  type: 'water' | 'electric';
  previousReading: number;
  currentReading: number;
  unitsUsed: number;
  readingDate: string;
  billId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceipt {
  id: string;
  billId: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'promptpay';
  paymentDate: string;
  receiptNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptPayConfig {
  dormitoryId: string;
  accountName: string;
  accountNumber: string;
  qrCodeUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  dormitoryId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: 'savings' | 'current';
  branchName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  billId: string;
  dormitoryId: string;
  tenantId: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'promptpay';
  paidAt: Date;
  reference?: string;
  evidence?: string;
  status: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethod = 'cash' | 'transfer' | 'promptpay';

// เพิ่ม interface สำหรับ response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | Error;
}

// เพิ่ม interface สำหรับ bill summary
export interface BillSummary {
  totalBills: number;
  totalAmount: number;
  paidBills: number;
  paidAmount: number;
  pendingBills: number;
  pendingAmount: number;
  overdueBills: number;
  overdueAmount: number;
}