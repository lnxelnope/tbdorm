'use client';

import { useState } from 'react';
import TenantDetailsModal from "@/components/tenants/TenantDetailsModal";

export default function BillsPage() {
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);

  // เพิ่มคอลัมน์ชื่อผู้เช่าใน columns
  const columns = [
    // ... คอลัมน์อื่นๆ ...
    {
      header: "ผู้เช่า",
      accessorKey: "tenantName",
      cell: ({ row }) => (
        <button
          onClick={() => {
            setSelectedTenant(row.original.tenantId);
            setIsTenantModalOpen(true);
          }}
          className="text-blue-600 hover:underline"
        >
          {row.original.tenantName}
        </button>
      )
    },
    // ... คอลัมน์อื่นๆ ...
  ];

  return (
    <>
      {/* ... existing code ... */}
      
      {/* เพิ่ม TenantDetailsModal */}
      {selectedTenant && (
        <TenantDetailsModal
          isOpen={isTenantModalOpen}
          onClose={() => {
            setIsTenantModalOpen(false);
            setSelectedTenant(null);
          }}
          dormitoryId={dormitoryId}
          tenantId={selectedTenant}
        />
      )}
    </>
  );
} 