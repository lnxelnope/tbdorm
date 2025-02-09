import { queryDormitories } from "@/lib/firebase/firebaseUtils";
import TenantHistoryList from "@/components/tenants/TenantHistoryList";

export default async function TenantHistoryPage() {
  const dormitoriesResult = await queryDormitories();
  const dormitories = dormitoriesResult.success ? dormitoriesResult.data : [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">ประวัติผู้เช่าเก่า</h1>
      </div>
      
      <TenantHistoryList dormitories={dormitories} />
    </div>
  );
} 