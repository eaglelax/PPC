import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  serverTimestamp,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { BetAmount } from '../types';
import { createGame } from './gameService';

const WAITING_ROOM = 'waiting_room';

export async function joinWaitingRoom(
  userId: string,
  displayName: string,
  betAmount: BetAmount
): Promise<string> {
  // Check if there's already someone waiting with the same bet
  const q = query(
    collection(db, WAITING_ROOM),
    where('betAmount', '==', betAmount),
    where('status', '==', 'waiting'),
    limit(1)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    const waitingDoc = snap.docs[0];
    const waitingData = waitingDoc.data();

    // Don't match with yourself
    if (waitingData.userId !== userId) {
      // Match found! Create a game
      await updateDoc(doc(db, WAITING_ROOM, waitingDoc.id), { status: 'matched' });

      const gameId = await createGame(
        { userId: waitingData.userId, displayName: waitingData.displayName },
        { userId, displayName },
        betAmount
      );

      // Create a matched entry for the current player
      const matchedRef = await addDoc(collection(db, WAITING_ROOM), {
        userId,
        displayName,
        betAmount,
        createdAt: serverTimestamp(),
        status: 'matched',
        gameId,
      });

      // Update the original waiting entry with the gameId
      await updateDoc(doc(db, WAITING_ROOM, waitingDoc.id), { gameId });

      return matchedRef.id;
    }
  }

  // No match found, join the queue
  const ref = await addDoc(collection(db, WAITING_ROOM), {
    userId,
    displayName,
    betAmount,
    createdAt: serverTimestamp(),
    status: 'waiting',
  });
  return ref.id;
}

export function onWaitingForMatch(
  userId: string,
  betAmount: BetAmount,
  callback: (gameId: string | null) => void
) {
  const q = query(
    collection(db, WAITING_ROOM),
    where('userId', '==', userId),
    where('betAmount', '==', betAmount)
  );

  return onSnapshot(q, (snap) => {
    for (const d of snap.docs) {
      const data = d.data();
      if (data.status === 'matched' && data.gameId) {
        callback(data.gameId);
        return;
      }
    }
    callback(null);
  });
}

export async function cleanupUserWaiting(userId: string): Promise<void> {
  const q = query(
    collection(db, WAITING_ROOM),
    where('userId', '==', userId),
    where('status', '==', 'waiting')
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}
