export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'admin' | 'staff';
  createdAt: string;
  updatedAt: string;
} 