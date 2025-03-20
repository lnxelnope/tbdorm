import * as admin from 'firebase-admin';

// แปลง private key จาก environment variable
const getPrivateKey = () => {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) {
    throw new Error('FIREBASE_PRIVATE_KEY is not set in environment variables');
  }
  // ถ้า key เริ่มต้นและจบด้วย quotes ให้ตัดออก
  return key.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1');
};

if (!admin.apps.length) {
  try {
    const privateKey = getPrivateKey();
    
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('FIREBASE_CLIENT_EMAIL is not set in environment variables');
    }
    
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set in environment variables');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      }),
      databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    // ให้ข้อมูลเพิ่มเติมเกี่ยวกับสถานะของ environment variables
    console.error('Environment variables status:', {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'set' : 'missing',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'missing',
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'set' : 'missing'
    });
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage(); 