import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { registerProfile } from '../config/api';
import { UserData } from '../types';

const USERS_COLLECTION = 'users';

export async function createUser(displayName: string, email?: string, referralCode?: string): Promise<void> {
  // Registration goes through the API which handles:
  // - Creating user in Firestore with referralCode, referredBy, referralStats
  // - Validating referral code if provided
  // - Getting phone from Firebase Auth user
  await registerProfile(displayName, email, referralCode);
}

export async function getUser(uid: string): Promise<UserData | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as UserData;
}

export async function updateBalance(uid: string, newBalance: number): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { balance: newBalance });
}

export async function updateStats(uid: string, won: boolean): Promise<void> {
  const user = await getUser(uid);
  if (!user) return;
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    'stats.gamesPlayed': user.stats.gamesPlayed + 1,
    'stats.wins': user.stats.wins + (won ? 1 : 0),
    'stats.losses': user.stats.losses + (won ? 0 : 1),
  });
}

export function onUserSnapshot(uid: string, callback: (user: UserData | null) => void) {
  const userRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserData);
    } else {
      callback(null);
    }
  });
}
