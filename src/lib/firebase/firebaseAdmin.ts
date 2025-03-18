import * as admin from 'firebase-admin';

// ตรวจสอบว่ามีการเริ่มต้น Firebase Admin SDK แล้วหรือไม่
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    // Set CORS configuration
    const bucket = admin.storage().bucket();
    bucket.setCorsConfiguration([
      {
        origin: ['https://tbdorm.vercel.app', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
        maxAgeSeconds: 3600,
        responseHeader: [
          'Content-Type',
          'Content-Length',
          'Content-Encoding',
          'Content-Disposition',
          'Authorization',
          'Accept',
          'Origin',
          'x-goog-meta-*'
        ]
      }
    ]);

    console.log('Firebase Admin SDK initialized');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminStorage = admin.storage();

export default admin; 