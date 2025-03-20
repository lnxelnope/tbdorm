import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin
const apps = getApps();

if (!apps.length) {
  // ตรวจสอบว่ามี environment variables ครบหรือไม่
  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL must be set in environment variables');
  }

  // แปลง private key จาก environment variable
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  initializeApp({
    credential: cert({
      projectId: 'tbdorm-37f43',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
    storageBucket: 'tbdorm-37f43.appspot.com'
  });
}

// Export Firebase Admin instances
export const adminDb = getFirestore();
export const adminAuth = getAuth();
export const adminStorage = getStorage();
