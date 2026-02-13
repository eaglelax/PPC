import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin SDK
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: use service account from env var (raw JSON or base64)
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw.startsWith('{')) {
    raw = Buffer.from(raw, 'base64').toString('utf-8');
  }
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  // Local development: use local-credentials.json (Firebase CLI refresh token)
  const credPath = path.join(__dirname, '../../local-credentials.json');
  if (fs.existsSync(credPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'ppc-game-8b35f',
  });
}

export const db = admin.firestore();
export const authAdmin = admin.auth();
export default admin;
