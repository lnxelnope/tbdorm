export interface Bill {
  id: string;
  dormitoryId: string;
  roomId: string;
  tenantId: string;
  month: string; // YYYY-MM
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  items: BillItem[];
  totalAmount: number;
  paidAmount: number;
  paidAt?: string;
  paymentMethod?: 'cash' | 'transfer' | 'promptpay' | 'bank_transfer';
  paymentProof?: string;
  bankTransferInfo?: {
    bankName: string;
    accountNumber: string;
    transferDate: string;
    transferAmount: number;
    reference?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BillItem {
  type: 'rent' | 'water' | 'electric' | 'maintenance' | 'other';
  description: string;
  amount: number;
  unit?: number;
  rate?: number;
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
  amount: number;
  method: 'cash' | 'transfer' | 'promptpay';
  reference?: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethod = 'cash' | 'transfer' | 'promptpay'; 