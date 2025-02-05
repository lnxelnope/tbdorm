import {
  Building2,
  Users,
  Droplets,
  Zap,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface DormitoryCardProps {
  id: string;
  name: string;
  address: string;
  totalRooms: number;
  occupiedRooms: number;
  totalTenants: number;
  waterRate: number;
  electricityRate: number;
  lateFee: number;
  paymentDueDay: number;
}

export default function DormitoryCard({
  id,
  name,
  address,
  totalRooms,
  occupiedRooms,
  totalTenants,
  waterRate,
  electricityRate,
  lateFee,
  paymentDueDay,
}: DormitoryCardProps) {
  const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
  const occupancyColor =
    occupancyRate >= 90
      ? "text-green-600"
      : occupancyRate >= 70
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-gray-400" />
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{address}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">ผู้เช่า</span>
            </div>
            <p className="mt-1 text-lg font-semibold">{totalTenants} คน</p>
          </div>
          <div>
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">อัตราการเข้าพัก</span>
            </div>
            <p className={`mt-1 text-lg font-semibold ${occupancyColor}`}>
              {occupancyRate}%
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <dt className="flex items-center text-sm text-gray-500">
                <Droplets className="h-4 w-4 mr-2" />
                ค่าน้ำ (ต่อคน)
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {waterRate} บาท
              </dd>
            </div>
            <div>
              <dt className="flex items-center text-sm text-gray-500">
                <Zap className="h-4 w-4 mr-2" />
                ค่าไฟ (ต่อหน่วย)
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {electricityRate} บาท
              </dd>
            </div>
            <div>
              <dt className="flex items-center text-sm text-gray-500">
                <AlertTriangle className="h-4 w-4 mr-2" />
                ค่าปรับล่าช้า
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {lateFee} บาท
              </dd>
            </div>
            <div>
              <dt className="flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-2" />
                กำหนดชำระ
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                ทุกวันที่ {paymentDueDay}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6">
          <Link
            href={`/dormitories/${id}`}
            className="block w-full bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 text-center hover:bg-gray-100 rounded-md"
          >
            ดูรายละเอียด
          </Link>
        </div>
      </div>
    </div>
  );
} 