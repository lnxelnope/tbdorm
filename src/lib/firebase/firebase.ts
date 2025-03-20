import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Import service account
import serviceAccount from '../../config/service-account.json';

// Initialize Firebase Admin
const apps = getApps();

if (!apps.length) {
  initializeApp({
    credential: cert(serviceAccount as any),
    storageBucket: 'tbdorm-37f43.appspot.com'
  });
}

// Export Firebase Admin instances
export const adminDb = getFirestore();
export const adminAuth = getAuth();
export const adminStorage = getStorage();
