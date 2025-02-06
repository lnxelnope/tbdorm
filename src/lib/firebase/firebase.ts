import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log('Firebase config:', firebaseConfig);

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized:', app.name);
} else {
  app = getApps()[0];
  console.log('Using existing Firebase app:', app.name);
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

console.log('Firebase services initialized');

// Initialize Analytics and export it
let analytics = null;
if (typeof window !== 'undefined') {
  // Only initialize analytics on the client side
  isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}

export { db, auth, storage, analytics };
