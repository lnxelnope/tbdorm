export interface Bill {
  id: string;
  dormitoryId: string;
  roomNumber: string;
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
  notificationsSent: {
    initial: boolean;
    reminder: boolean;
    overdue: boolean;
  };
}

export interface BillItem {
  type: 'rent' | 'water' | 'electric' | 'parking' | 'air_conditioner' | 'other';
  description: string;
  amount: number;
  quantity?: number;
  unitPrice?: number;
  utilityReading?: {
    previous: number;
    current: number;
    units: number;
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
  method: 'cash' | 'transfer' | 'promptpay';
  status: 'pending' | 'completed' | 'failed';
  reference?: string; // เลขอ้างอิงการโอน หรือ Transaction ID
  evidence?: string; // URL รูปสลิป
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
  processedBy?: string; // ID ของผู้ดูแลที่ดำเนินการ
}

export type PaymentMethod = 'cash' | 'transfer' | 'promptpay'; 