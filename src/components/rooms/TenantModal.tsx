import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tenant } from '@/types/dormitory';

interface TenantModalProps {
  tenant: Tenant | null;
  onClose: () => void;
}

export default function TenantModal({ tenant, onClose }: TenantModalProps) {
  if (!tenant) return null;

  return (
    <Dialog open={!!tenant} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ข้อมูลผู้เช่า</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">ชื่อ-นามสกุล</h3>
            <p>{tenant.firstName} {tenant.lastName}</p>
          </div>
          <div>
            <h3 className="font-medium">เบอร์โทรศัพท์</h3>
            <p>{tenant.phone}</p>
          </div>
          {tenant.email && (
            <div>
              <h3 className="font-medium">อีเมล</h3>
              <p>{tenant.email}</p>
            </div>
          )}
          <div>
            <h3 className="font-medium">วันที่เข้าพัก</h3>
            <p>{tenant.moveInDate ? new Date(tenant.moveInDate).toLocaleDateString('th-TH') : '-'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 