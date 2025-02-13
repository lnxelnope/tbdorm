export interface Bill {
  id: string;
  dormitoryId: string;
  roomNumber: string;
  tenantId: string;
  tenantName: string;
  month: number;
  year: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  items: BillItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: Date;
  updatedAt: Date;
  payments: Payment[];
  notificationsSent: number;
}

export interface BillItem {
  type: 'rent' | 'water' | 'electric' | 'other';
  name: string;
  amount: number;
  unit?: number;
  rate?: number;
  description?: string;
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
  amount: number;
  method: 'cash' | 'transfer' | 'promptpay';
  status: 'pending' | 'completed' | 'failed';
  receiptUrl?: string;
  paidAt: Date;
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