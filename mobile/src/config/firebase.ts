import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator, initializeAuth, getAuth } from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDa_c6IWWPHf_7PQVbWRkxeZotDERMRyFc",
  authDomain: "ppc-game-8b35f.firebaseapp.com",
  projectId: "ppc-game-8b35f",
  storageBucket: "ppc-game-8b35f.firebasestorage.app",
  messagingSenderId: "247217057345",
  appId: "1:247217057345:web:cba5bc80f70439d81ce0c0",
  measurementId: "G-JRWKGPX1KF"
};

// Google Sign-In: web client ID from Firebase Console > Authentication > Google provider
// Format: 247217057345-XXXXX.apps.googleusercontent.com
export const GOOGLE_WEB_CLIENT_ID = '247217057345-REPLACE_ME.apps.googleusercontent.com';

const USE_EMULATORS = false; // Set to __DEV__ to use local emulators
const EMULATOR_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

const app = initializeApp(firebaseConfig);

// Firebase auth setup
let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getReactNativePersistence } = require('firebase/auth');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);

// Connect to emulators in dev mode
if (USE_EMULATORS) {
  try {
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
  } catch {
    // Already connected
  }
}

export default app;
