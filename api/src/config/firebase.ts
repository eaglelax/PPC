import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Support both raw JSON and base64-encoded JSON
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw.startsWith('{')) {
    raw = Buffer.from(raw, 'base64').toString('utf-8');
  }
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  // Local development fallback
  admin.initializeApp({
    projectId: 'ppc-game-8b35f',
  });
}

export const db = admin.firestore();
export const authAdmin = admin.auth();
export default admin;
