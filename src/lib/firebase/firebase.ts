import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, connectFirestoreEmulator, collection, doc, setDoc, deleteDoc, getDocs, query, limit } from "firebase/firestore";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log('Firebase config:', {
  apiKey: firebaseConfig.apiKey ? '***' : 'missing',
  authDomain: firebaseConfig.authDomain ? '***' : 'missing',
  projectId: firebaseConfig.projectId ? firebaseConfig.projectId : 'missing',
  storageBucket: firebaseConfig.storageBucket ? '***' : 'missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? '***' : 'missing',
  appId: firebaseConfig.appId ? '***' : 'missing',
  measurementId: firebaseConfig.measurementId ? '***' : 'missing',
});

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  try {
    if (!getApps().length) {
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error('Firebase configuration is incomplete. Check your environment variables.');
      }
      
      app = initializeApp(firebaseConfig);
      console.log('Firebase app initialized:', app.name);
    } else {
      app = getApps()[0];
      console.log('Using existing Firebase app:', app.name);
    }

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // ตรวจสอบการเชื่อมต่อกับ Firestore
    try {
      const testConnection = async () => {
        try {
          console.log('Testing Firestore connection...');
          
          // ทดสอบด้วยการอ่านข้อมูลแทนการเขียน (อ่านเป็นการกระทำที่เบากว่า)
          const testQuery = query(collection(db, 'dormitories'), limit(1));
          await getDocs(testQuery);
          console.log('Firestore connection successful!');
        } catch (error) {
          console.error('Firestore connection test failed:', error);
          
          // ตรวจสอบประเภทของข้อผิดพลาด
          const errorMessage = (error as Error).message || '';
          if (errorMessage.includes('network') || errorMessage.includes('offline') || errorMessage.includes('unavailable')) {
            console.error('Network error detected:', errorMessage);
            alert('ไม่สามารถเชื่อมต่อกับ Firebase ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
          } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            console.error('Permission error detected:', errorMessage);
            alert('ไม่มีสิทธิ์เข้าถึงข้อมูล Firebase กรุณาตรวจสอบการตั้งค่าสิทธิ์การเข้าถึง');
          } else {
            console.error('Unknown Firebase error:', errorMessage);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Firebase: ' + errorMessage);
          }
        }
      };
      
      // เรียกใช้ฟังก์ชันทดสอบการเชื่อมต่อ
      testConnection();
    } catch (error) {
      console.error('Error testing Firestore connection:', error);
    }

    // Initialize Analytics only in production
    if (process.env.NODE_ENV === 'production') {
      isSupported().then(yes => yes && (analytics = getAnalytics(app)));
    }

    console.log('Firebase services initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    if (typeof window !== 'undefined') {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Firebase: ' + (error as Error).message);
    }
  }
} else {
  console.log('Firebase initialization skipped (server-side)');
}

export { db, auth, storage, analytics };
