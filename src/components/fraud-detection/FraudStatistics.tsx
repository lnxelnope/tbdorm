import { Droplets, Zap, Building2 } from "lucide-react";

export default function FraudStatistics() {
  // ตัวอย่างข้อมูล (จะถูกแทนที่ด้วยข้อมูลจริงจาก Firebase)
  const stats = {
    total: 10,
    pending: 2,
    investigating: 3,
    confirmed: 4,
    falseAlarm: 1,
    byType: {
      electricity: 6,
      water: 4,
    },
    byDormitory: [
      { name: "หอพักสุขสบาย 1", count: 4 },
      { name: "หอพักสุขสบาย 2", count: 3 },
      { name: "หอพักสุขสบาย 3", count: 3 },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <dl className="grid grid-cols-2 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-yellow-800">รอตรวจสอบ</dt>
            <dd className="mt-1 text-3xl font-semibold text-yellow-900">
              {stats.pending}
            </dd>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-blue-800">กำลังตรวจสอบ</dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-900">
              {stats.investigating}
            </dd>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-red-800">ยืนยันทุจริต</dt>
            <dd className="mt-1 text-3xl font-semibold text-red-900">
              {stats.confirmed}
            </dd>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <dt className="text-sm font-medium text-green-800">ไม่พบทุจริต</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-900">
              {stats.falseAlarm}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          แยกตามประเภท
        </h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <Zap className="h-5 w-5 text-yellow-500" />
            <div className="ml-2 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">ไฟฟ้า</span>
                <span className="text-sm text-gray-500">
                  {stats.byType.electricity} ครั้ง
                </span>
              </div>
              <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.byType.electricity / stats.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <Droplets className="h-5 w-5 text-blue-500" />
            <div className="ml-2 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">น้ำประปา</span>
                <span className="text-sm text-gray-500">
                  {stats.byType.water} ครั้ง
                </span>
              </div>
              <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.byType.water / stats.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          แยกตามหอพัก
        </h3>
        <div className="space-y-3">
          {stats.byDormitory.map((dorm) => (
            <div key={dorm.name} className="flex items-center">
              <Building2 className="h-5 w-5 text-gray-400" />
              <div className="ml-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {dorm.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {dorm.count} ครั้ง
                  </span>
                </div>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-500 h-2 rounded-full"
                    style={{
                      width: `${(dorm.count / stats.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 