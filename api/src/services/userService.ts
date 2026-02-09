import { db } from '../config/firebase';
import { INITIAL_BALANCE } from '../config/constants';

const USERS = 'users';

export async function createUser(uid: string, email: string, displayName: string) {
  const userRef = db.collection(USERS).doc(uid);
  const existing = await userRef.get();
  if (existing.exists) {
    throw new Error('Utilisateur deja existant.');
  }

  const userData = {
    odId: uid,
    email,
    displayName,
    balance: INITIAL_BALANCE,
    createdAt: new Date(),
    stats: { gamesPlayed: 0, wins: 0, losses: 0 },
  };

  await userRef.set(userData);
  return userData;
}

export async function getUser(uid: string) {
  const snap = await db.collection(USERS).doc(uid).get();
  if (!snap.exists) return null;
  return snap.data()!;
}

export async function updateBalance(uid: string, newBalance: number) {
  await db.collection(USERS).doc(uid).update({ balance: newBalance });
}

export async function updateStats(uid: string, won: boolean) {
  const user = await getUser(uid);
  if (!user) return;
  await db.collection(USERS).doc(uid).update({
    'stats.gamesPlayed': user.stats.gamesPlayed + 1,
    'stats.wins': user.stats.wins + (won ? 1 : 0),
    'stats.losses': user.stats.losses + (won ? 0 : 1),
  });
}

export async function getAllUsers() {
  const snap = await db.collection(USERS).orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserCount() {
  const snap = await db.collection(USERS).count().get();
  return snap.data().count;
}
