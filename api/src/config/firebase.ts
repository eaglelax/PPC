import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
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
