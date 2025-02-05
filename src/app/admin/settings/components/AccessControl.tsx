"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';

interface Permission {
  id: string;
  name: string;
  description: string;
  roles: ('owner' | 'admin' | 'staff')[];
}

interface AccessControlSettings {
  permissions: Permission[];
}

const DEFAULT_PERMISSIONS: Permission[] = [
  {
    id: 'manage_users',
    name: 'จัดการผู้ใช้งาน',
    description: 'เพิ่ม ลบ แก้ไขข้อมูลผู้ใช้งานระบบ',
    roles: ['owner', 'admin']
  },
  {
    id: 'manage_dormitories',
    name: 'จัดการหอพัก',
    description: 'เพิ่ม ลบ แก้ไขข้อมูลหอพัก',
    roles: ['owner', 'admin']
  },
  {
    id: 'manage_rooms',
    name: 'จัดการห้องพัก',
    description: 'เพิ่ม ลบ แก้ไขข้อมูลห้องพัก',
    roles: ['owner', 'admin', 'staff']
  },
  {
    id: 'manage_tenants',
    name: 'จัดการผู้เช่า',
    description: 'เพิ่ม ลบ แก้ไขข้อมูลผู้เช่า',
    roles: ['owner', 'admin', 'staff']
  },
  {
    id: 'manage_bills',
    name: 'จัดการบิล',
    description: 'สร้าง แก้ไข ยกเลิกบิล',
    roles: ['owner', 'admin', 'staff']
  },
  {
    id: 'manage_payments',
    name: 'จัดการการชำระเงิน',
    description: 'บันทึก ยกเลิกการชำระเงิน',
    roles: ['owner', 'admin', 'staff']
  },
  {
    id: 'manage_meter_readings',
    name: 'จดมิเตอร์',
    description: 'บันทึก แก้ไขค่ามิเตอร์น้ำและไฟฟ้า',
    roles: ['owner', 'admin', 'staff']
  },
  {
    id: 'manage_maintenance',
    name: 'จัดการแจ้งซ่อม',
    description: 'ดู บันทึก อัพเดทสถานะการแจ้งซ่อม',
    roles: ['owner', 'admin', 'staff']
  },
  {
    id: 'manage_fraud_detection',
    name: 'ตรวจจับทุจริต',
    description: 'ดูและจัดการรายการต้องสงสัย',
    roles: ['owner', 'admin']
  },
  {
    id: 'view_reports',
    name: 'ดูรายงาน',
    description: 'เรียกดูรายงานต่างๆ',
    roles: ['owner', 'admin']
  },
  {
    id: 'manage_settings',
    name: 'จัดการการตั้งค่า',
    description: 'แก้ไขการตั้งค่าระบบ',
    roles: ['owner', 'admin']
  }
];

export default function AccessControl() {
  const [settings, setSettings] = useState<AccessControlSettings>({
    permissions: DEFAULT_PERMISSIONS
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'access_control');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // ถ้ามีข้อมูลเดิม ให้รวมกับสิทธิ์ใหม่
        const existingPermissions = docSnap.data() as AccessControlSettings;
        const mergedPermissions = DEFAULT_PERMISSIONS.map(defaultPerm => {
          const existingPerm = existingPermissions.permissions.find(p => p.id === defaultPerm.id);
          return existingPerm || defaultPerm;
        });
        
        setSettings({ permissions: mergedPermissions });
        // อัพเดทข้อมูลใน Firestore ด้วย
        await setDoc(docRef, { permissions: mergedPermissions });
      } else {
        // ถ้ายังไม่มีการตั้งค่า ให้ใช้ค่าเริ่มต้น
        await setDoc(docRef, { permissions: DEFAULT_PERMISSIONS });
        setSettings({ permissions: DEFAULT_PERMISSIONS });
      }
    } catch (error) {
      console.error('Error loading access control settings:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดการตั้งค่าสิทธิ์การเข้าถึง');
    }
  };

  const handleToggleRole = async (permissionId: string, role: 'owner' | 'admin' | 'staff') => {
    try {
      const updatedPermissions = settings.permissions.map(permission => {
        if (permission.id === permissionId) {
          const roles = permission.roles.includes(role)
            ? permission.roles.filter(r => r !== role)
            : [...permission.roles, role];
          return { ...permission, roles };
        }
        return permission;
      });

      await setDoc(doc(db, 'settings', 'access_control'), {
        permissions: updatedPermissions
      });

      setSettings({ permissions: updatedPermissions });
      toast.success('บันทึกการตั้งค่าสิทธิ์การเข้าถึงสำเร็จ');
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกการตั้งค่าสิทธิ์การเข้าถึง');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* กลุ่มจัดการผู้ใช้และหอพัก */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">การจัดการระบบ</h2>
          {settings.permissions
            .filter(p => ['manage_users', 'manage_dormitories', 'manage_settings'].includes(p.id))
            .map((permission) => (
              <PermissionItem
                key={permission.id}
                permission={permission}
                onToggleRole={handleToggleRole}
              />
            ))}
        </div>

        {/* กลุ่มจัดการห้องพักและผู้เช่า */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">การจัดการห้องพักและผู้เช่า</h2>
          {settings.permissions
            .filter(p => ['manage_rooms', 'manage_tenants'].includes(p.id))
            .map((permission) => (
              <PermissionItem
                key={permission.id}
                permission={permission}
                onToggleRole={handleToggleRole}
              />
            ))}
        </div>

        {/* กลุ่มจัดการการเงิน */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">การจัดการการเงิน</h2>
          {settings.permissions
            .filter(p => ['manage_bills', 'manage_payments', 'manage_meter_readings'].includes(p.id))
            .map((permission) => (
              <PermissionItem
                key={permission.id}
                permission={permission}
                onToggleRole={handleToggleRole}
              />
            ))}
        </div>

        {/* กลุ่มแจ้งซ่อมและความปลอดภัย */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">การแจ้งซ่อมและความปลอดภัย</h2>
          {settings.permissions
            .filter(p => ['manage_maintenance', 'manage_fraud_detection'].includes(p.id))
            .map((permission) => (
              <PermissionItem
                key={permission.id}
                permission={permission}
                onToggleRole={handleToggleRole}
              />
            ))}
        </div>

        {/* กลุ่มรายงาน */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">รายงาน</h2>
          {settings.permissions
            .filter(p => ['view_reports'].includes(p.id))
            .map((permission) => (
              <PermissionItem
                key={permission.id}
                permission={permission}
                onToggleRole={handleToggleRole}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

// Component แยกสำหรับแสดงแต่ละสิทธิ์
function PermissionItem({ 
  permission, 
  onToggleRole 
}: { 
  permission: Permission;
  onToggleRole: (id: string, role: 'owner' | 'admin' | 'staff') => void;
}) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{permission.name}</h3>
          <p className="text-sm text-gray-500">{permission.description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={permission.roles.includes('owner')}
              onChange={() => onToggleRole(permission.id, 'owner')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">เจ้าของ</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={permission.roles.includes('admin')}
              onChange={() => onToggleRole(permission.id, 'admin')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">ผู้ดูแลระบบ</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={permission.roles.includes('staff')}
              onChange={() => onToggleRole(permission.id, 'staff')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">เจ้าหน้าที่</span>
          </label>
        </div>
      </div>
    </div>
  );
} 