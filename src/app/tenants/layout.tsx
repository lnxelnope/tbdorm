"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, History } from "lucide-react";

export default function TenantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "รายชื่อผู้เช่า",
      href: "/tenants",
      icon: Users,
      current: pathname === "/tenants",
    },
    {
      name: "ประวัติผู้เช่าเก่า",
      href: "/tenants/history",
      icon: History,
      current: pathname === "/tenants/history",
    },
  ];

  return (
    <div className="flex-1 bg-gray-50">
      {children}
    </div>
  );
} 