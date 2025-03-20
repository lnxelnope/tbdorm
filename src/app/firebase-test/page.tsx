"use client";

import { useEffect, useState } from "react";
import { db, auth, storage } from "@/lib/firebase/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  limit, 
  collectionGroup,
  getCountFromServer,
  orderBy,
  where
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  Home, 
  FileText, 
  CreditCard, 
  Wrench, 
  Database, 
  RefreshCw,
  Bed,
  User,
  FileBarChart,
  ListChecks
} from "lucide-react";
import { ref, listAll } from "firebase/storage";

interface FirebaseCollection {
  name: string;
  count: number;
  icon: JSX.Element;
  color: string;
  lastUpdated?: string;
  sampleData?: any;
}

interface CollectionCount {
  [key: string]: number;
}

export default function FirebaseTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>("ยังไม่ได้ทดสอบ");
  const [dormitories, setDormitories] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [collections, setCollections] = useState<FirebaseCollection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [collectionCounts, setCollectionCounts] = useState<CollectionCount>({});
  const [storageFiles, setStorageFiles] = useState<number>(0);
  const [authStatus, setAuthStatus] = useState<string>("ไม่ได้ตรวจสอบ");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [activeDormId, setActiveDormId] = useState<string | null>(null);
  const [roomsForDorm, setRoomsForDorm] = useState<any[]>([]);
  const [tenantsForRoom, setTenantsForRoom] = useState<any[]>([]);

  // ชื่อคอลเลกชันหลักที่ต้องการตรวจสอบ
  const mainCollections = [
    { name: 'dormitories', icon: <Building2 size={20} />, color: 'bg-blue-100 text-blue-700' },
    { name: 'rooms', icon: <Home size={20} />, color: 'bg-green-100 text-green-700' },
    { name: 'tenants', icon: <Users size={20} />, color: 'bg-yellow-100 text-yellow-700' },
    { name: 'bills', icon: <FileText size={20} />, color: 'bg-purple-100 text-purple-700' },
    { name: 'payments', icon: <CreditCard size={20} />, color: 'bg-pink-100 text-pink-700' },
    { name: 'maintenance', icon: <Wrench size={20} />, color: 'bg-orange-100 text-orange-700' },
    { name: 'meter_readings', icon: <ListChecks size={20} />, color: 'bg-teal-100 text-teal-700' },
    { name: 'reports', icon: <FileBarChart size={20} />, color: 'bg-indigo-100 text-indigo-700' },
  ];

  const getCollectionCounts = async () => {
    const counts: CollectionCount = {};
    
    try {
      for (const col of mainCollections) {
        const collRef = collection(db, col.name);
        const snapshot = await getCountFromServer(collRef);
        counts[col.name] = snapshot.data().count;
      }
      
      setCollectionCounts(counts);
      
      // สร้างรายการคอลเลกชันพร้อมไอคอนและจำนวน
      const collectionList = mainCollections.map(col => ({
        name: col.name,
        count: counts[col.name] || 0,
        icon: col.icon,
        color: col.color
      }));
      
      setCollections(collectionList);
    } catch (error) {
      console.error("Error getting collection counts:", error);
      setError(`ไม่สามารถนับจำนวนเอกสารในคอลเลกชันได้: ${(error as Error).message}`);
    }
  };

  const getStorageInfo = async () => {
    try {
      const storageRef = ref(storage);
      const result = await listAll(storageRef);
      let totalFiles = result.items.length;
      
      // นับไฟล์ในโฟลเดอร์
      for (const folder of result.prefixes) {
        const folderResult = await listAll(folder);
        totalFiles += folderResult.items.length;
      }
      
      setStorageFiles(totalFiles);
    } catch (error) {
      console.error("Error getting storage info:", error);
    }
  };

  const checkAuth = () => {
    try {
      const user = auth.currentUser;
      if (user) {
        setAuthStatus(`ล็อกอินแล้ว (${user.email})`);
      } else {
        setAuthStatus("ยังไม่ได้ล็อกอิน");
      }
    } catch (error) {
      setAuthStatus(`ข้อผิดพลาด: ${(error as Error).message}`);
    }
  };

  // ดึงข้อมูลห้องพัก
  const getRooms = async () => {
    try {
      const roomsQuery = query(collection(db, 'rooms'), limit(10));
      const snapshot = await getDocs(roomsQuery);
      
      if (snapshot.empty) {
        setRooms([]);
        return;
      }
      
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRooms(roomsData);
    } catch (error) {
      console.error("Error getting rooms data:", error);
    }
  };
  
  // ดึงข้อมูลผู้เช่า
  const getTenants = async () => {
    try {
      const tenantsQuery = query(collection(db, 'tenants'), limit(10));
      const snapshot = await getDocs(tenantsQuery);
      
      if (snapshot.empty) {
        setTenants([]);
        return;
      }
      
      const tenantsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTenants(tenantsData);
    } catch (error) {
      console.error("Error getting tenants data:", error);
    }
  };
  
  // ดึงข้อมูลห้องพักของหอพักที่เลือก
  const getRoomsForDormitory = async (dormId: string) => {
    try {
      setActiveDormId(dormId);
      
      const roomsQuery = query(
        collection(db, 'rooms'),
        where('dormitoryId', '==', dormId),
        limit(20)
      );
      
      const snapshot = await getDocs(roomsQuery);
      
      if (snapshot.empty) {
        setRoomsForDorm([]);
        return;
      }
      
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRoomsForDorm(roomsData);
      
      // รีเซ็ตข้อมูลผู้เช่าของห้อง
      setTenantsForRoom([]);
    } catch (error) {
      console.error(`Error getting rooms for dormitory ${dormId}:`, error);
    }
  };
  
  // ดึงข้อมูลผู้เช่าของห้องพักที่เลือก
  const getTenantsForRoom = async (roomId: string) => {
    try {
      const tenantsQuery = query(
        collection(db, 'tenants'),
        where('roomId', '==', roomId),
        limit(10)
      );
      
      const snapshot = await getDocs(tenantsQuery);
      
      if (snapshot.empty) {
        setTenantsForRoom([]);
        return;
      }
      
      const tenantsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTenantsForRoom(tenantsData);
    } catch (error) {
      console.error(`Error getting tenants for room ${roomId}:`, error);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    setConnectionStatus("กำลังทดสอบ...");

    try {
      console.log("Testing Firebase connection...");
      
      // ทดสอบการเชื่อมต่อโดยการอ่านข้อมูลจาก Firestore
      const testQuery = query(collection(db, 'dormitories'), limit(5));
      const snapshot = await getDocs(testQuery);
      
      if (snapshot.empty) {
        setConnectionStatus("เชื่อมต่อสำเร็จ แต่ไม่พบข้อมูลหอพัก");
        setDormitories([]);
      } else {
        // แปลงข้อมูลจาก Firestore ให้อยู่ในรูปแบบ JSON
        const dormitoriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setConnectionStatus("เชื่อมต่อสำเร็จ!");
        setDormitories(dormitoriesData);
        
        // เรียกดูข้อมูลเพิ่มเติม
        await getCollectionCounts();
        await getStorageInfo();
        await getRooms();
        await getTenants();
        checkAuth();
        
        // ถ้ามีหอพัก ดึงข้อมูลห้องพักของหอพักแรก
        if (dormitoriesData.length > 0) {
          getRoomsForDormitory(dormitoriesData[0].id);
        }
      }
    } catch (error) {
      console.error("Firebase connection test failed:", error);
      setConnectionStatus("เชื่อมต่อล้มเหลว");
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const viewCollectionSamples = async (collectionName: string) => {
    try {
      setSelectedCollection(collectionName);
      
      const collRef = collection(db, collectionName);
      const sampleQuery = query(collRef, orderBy('createdAt', 'desc'), limit(5));
      const snapshot = await getDocs(sampleQuery);
      
      if (snapshot.empty) {
        setSampleData([]);
        return;
      }
      
      const samples = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSampleData(samples);
    } catch (error) {
      console.error(`Error getting sample data for ${collectionName}:`, error);
      setError(`ไม่สามารถดูตัวอย่างข้อมูล ${collectionName} ได้: ${(error as Error).message}`);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-center">ระบบจัดการหอพัก TB Dorm</h1>
      <h2 className="text-xl font-bold mb-6 text-center">ทดสอบและตรวจสอบการเชื่อมต่อกับ Firebase</h2>
      
      <div className="mb-8">
        <Button 
          onClick={testConnection}
          disabled={isLoading}
          className="mb-4 flex items-center gap-2"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ"}
        </Button>
        
        <div className="p-4 rounded border bg-slate-50">
          <p><strong>สถานะการเชื่อมต่อ Firestore:</strong> {connectionStatus}</p>
          <p><strong>สถานะการยืนยันตัวตน:</strong> {authStatus}</p>
          <p><strong>จำนวนไฟล์ใน Storage:</strong> {storageFiles} ไฟล์</p>
          
          {error && (
            <p className="text-red-500 mt-2">
              <strong>ข้อผิดพลาด:</strong> {error}
            </p>
          )}
        </div>
      </div>
      
      {collections.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">คอลเลกชันใน Firestore</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {collections.map((col) => (
              <div 
                key={col.name} 
                className={`p-4 rounded border ${col.color} cursor-pointer hover:opacity-90 transition`}
                onClick={() => viewCollectionSamples(col.name)}
              >
                <div className="flex items-center gap-2 mb-2">
                  {col.icon}
                  <h3 className="font-semibold capitalize">{col.name.replace('_', ' ')}</h3>
                </div>
                <p className="text-lg font-bold">{col.count} รายการ</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {selectedCollection && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4 capitalize">
            ตัวอย่างข้อมูลล่าสุดใน {selectedCollection.replace('_', ' ')}
          </h2>
          {sampleData.length === 0 ? (
            <p>ไม่พบข้อมูลในคอลเลกชันนี้</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border rounded">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">ID</th>
                    <th className="border p-2 text-left">ข้อมูล</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2 align-top">{item.id}</td>
                      <td className="border p-2">
                        <pre className="text-xs overflow-auto max-h-40">
                          {JSON.stringify(item, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row gap-6 mb-10">
        {/* หอพัก */}
        {dormitories.length > 0 && (
          <div className="lg:w-1/3 mb-8 lg:mb-0">
            <h2 className="text-xl font-semibold mb-4">ข้อมูลหอพัก ({dormitories.length})</h2>
            <div className="overflow-y-auto max-h-96 border rounded">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">ชื่อ</th>
                    <th className="border p-2 text-left">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {dormitories.map((dorm) => (
                    <tr 
                      key={dorm.id} 
                      className={`cursor-pointer hover:bg-blue-50 ${activeDormId === dorm.id ? 'bg-blue-100' : ''}`}
                      onClick={() => getRoomsForDormitory(dorm.id)}
                    >
                      <td className="border p-2">{dorm.name}</td>
                      <td className="border p-2">{dorm.status || 'active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ห้องพัก */}
        {roomsForDorm.length > 0 && (
          <div className="lg:w-1/3 mb-8 lg:mb-0">
            <h2 className="text-xl font-semibold mb-4">
              ห้องพัก ({roomsForDorm.length})
              <span className="text-sm font-normal ml-2">
                {dormitories.find(d => d.id === activeDormId)?.name}
              </span>
            </h2>
            <div className="overflow-y-auto max-h-96 border rounded">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">เลขห้อง</th>
                    <th className="border p-2 text-left">ชั้น</th>
                    <th className="border p-2 text-left">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {roomsForDorm.map((room) => (
                    <tr 
                      key={room.id} 
                      className="cursor-pointer hover:bg-green-50"
                      onClick={() => getTenantsForRoom(room.id)}
                    >
                      <td className="border p-2">{room.number}</td>
                      <td className="border p-2">{room.floor}</td>
                      <td className="border p-2">{room.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ผู้เช่า */}
        {tenantsForRoom.length > 0 && (
          <div className="lg:w-1/3">
            <h2 className="text-xl font-semibold mb-4">ผู้เช่า ({tenantsForRoom.length})</h2>
            <div className="overflow-y-auto max-h-96 border rounded">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">ชื่อ</th>
                    <th className="border p-2 text-left">เบอร์โทร</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantsForRoom.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="border p-2">{tenant.firstName} {tenant.lastName}</td>
                      <td className="border p-2">{tenant.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* แสดงข้อมูลห้องพักทั้งหมด */}
      {rooms.length > 0 && !roomsForDorm.length && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">ข้อมูลห้องพักทั้งหมด ({rooms.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">ID</th>
                  <th className="border p-2 text-left">เลขห้อง</th>
                  <th className="border p-2 text-left">ชั้น</th>
                  <th className="border p-2 text-left">หอพัก</th>
                  <th className="border p-2 text-left">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td className="border p-2">{room.id}</td>
                    <td className="border p-2">{room.number}</td>
                    <td className="border p-2">{room.floor}</td>
                    <td className="border p-2">{room.dormitoryId}</td>
                    <td className="border p-2">{room.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* แสดงข้อมูลผู้เช่าทั้งหมด */}
      {tenants.length > 0 && !tenantsForRoom.length && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">ข้อมูลผู้เช่าทั้งหมด ({tenants.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border rounded">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">ID</th>
                  <th className="border p-2 text-left">ชื่อ</th>
                  <th className="border p-2 text-left">เบอร์โทร</th>
                  <th className="border p-2 text-left">อีเมล</th>
                  <th className="border p-2 text-left">ห้อง</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="border p-2">{tenant.id}</td>
                    <td className="border p-2">{tenant.firstName} {tenant.lastName}</td>
                    <td className="border p-2">{tenant.phone || '-'}</td>
                    <td className="border p-2">{tenant.email || '-'}</td>
                    <td className="border p-2">{tenant.roomId || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
        <h3 className="font-bold text-blue-800 mb-2">เข้าสู่ระบบการจัดการ</h3>
        <div className="flex flex-wrap gap-3 mt-2">
          <Button onClick={() => window.location.href = '/dormitories'} className="flex items-center gap-2">
            <Building2 size={16} />
            จัดการหอพัก
          </Button>
          <Button onClick={() => window.location.href = '/rooms'} className="flex items-center gap-2">
            <Bed size={16} />
            จัดการห้องพัก
          </Button>
          <Button onClick={() => window.location.href = '/tenants'} className="flex items-center gap-2">
            <User size={16} />
            จัดการผู้เช่า
          </Button>
          <Button onClick={() => window.location.href = '/bills'} className="flex items-center gap-2">
            <FileText size={16} />
            จัดการบิล
          </Button>
          <Button onClick={() => window.location.href = '/maintenance'} className="flex items-center gap-2">
            <Wrench size={16} />
            แจ้งซ่อม
          </Button>
        </div>
      </div>
    </div>
  );
} 