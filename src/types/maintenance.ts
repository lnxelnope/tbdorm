export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  roomNumber: string;
  requesterUid: string;
  requesterName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  images?: string[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  assignedTo?: string;
  notes?: MaintenanceNote[];
}

export interface MaintenanceNote {
  id: string;
  requestId: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface MaintenanceStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  averageCompletionTime?: number; // ในหน่วยวัน
}

export interface MaintenanceRequestResponse {
  success: boolean;
  data?: MaintenanceRequest | MaintenanceRequest[];
  error?: string;
}

export interface MaintenanceStatsResponse {
  success: boolean;
  data?: MaintenanceStats;
  error?: string;
}

export interface MaintenanceNoteResponse {
  success: boolean;
  data?: MaintenanceNote | MaintenanceNote[];
  error?: string;
} 