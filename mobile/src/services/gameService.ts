import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Choice, Game, BetAmount } from '../types';

const GAMES_COLLECTION = 'games';

export async function createGame(
  player1: { userId: string; displayName: string },
  player2: { userId: string; displayName: string },
  betAmount: BetAmount
): Promise<string> {
  const ref = await addDoc(collection(db, GAMES_COLLECTION), {
    player1: { userId: player1.userId, displayName: player1.displayName, choice: null },
    player2: { userId: player2.userId, displayName: player2.displayName, choice: null },
    betAmount,
    status: 'choosing',
    winner: null,
    round: 1,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function onGameUpdate(
  gameId: string,
  callback: (game: Game | null) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    doc(db, GAMES_COLLECTION, gameId),
    (snap) => {
      if (snap.exists()) {
        callback({ odId: snap.id, ...snap.data() } as Game);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Game snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

export function getRandomChoice(): Choice {
  const choices: Choice[] = ['pierre', 'papier', 'ciseaux'];
  return choices[Math.floor(Math.random() * 3)];
}
