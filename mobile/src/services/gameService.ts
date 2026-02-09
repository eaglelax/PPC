import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Choice, Game, BetAmount } from '../types';
import { updateBalance, getUser, updateStats } from './userService';
import { createTransaction } from './transactionService';

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

export function onGameUpdate(gameId: string, callback: (game: Game | null) => void) {
  return onSnapshot(doc(db, GAMES_COLLECTION, gameId), (snap) => {
    if (snap.exists()) {
      callback({ odId: snap.id, ...snap.data() } as Game);
    } else {
      callback(null);
    }
  });
}

export async function makeChoice(gameId: string, userId: string, choice: Choice): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(gameRef);
    if (!snap.exists()) return;

    const game = snap.data() as Game;
    if (game.status === 'resolved') return;

    const isPlayer1 = game.player1.userId === userId;
    const choiceField = isPlayer1 ? 'player1.choice' : 'player2.choice';
    const otherChoice = isPlayer1 ? game.player2.choice : game.player1.choice;

    if (!otherChoice) {
      transaction.update(gameRef, { [choiceField]: choice });
    } else {
      const p1Choice = isPlayer1 ? choice : otherChoice;
      const p2Choice = isPlayer1 ? otherChoice : choice;
      const result = determineWinner(p1Choice, p2Choice);

      if (result === 'draw') {
        transaction.update(gameRef, {
          [choiceField]: choice,
          status: 'draw',
          round: (game.round || 1) + 1,
        });
      } else {
        const winnerId = result === 'player1' ? game.player1.userId : game.player2.userId;
        transaction.update(gameRef, {
          [choiceField]: choice,
          status: 'resolved',
          winner: winnerId,
        });
      }
    }
  });

  // Process payouts or draw reset after transaction
  const updatedSnap = await getDoc(gameRef);
  if (!updatedSnap.exists()) return;
  const updatedGame = updatedSnap.data() as Game;

  if (updatedGame.status === 'resolved' && updatedGame.winner) {
    const winnerId = updatedGame.winner;
    const loserId = updatedGame.player1.userId === winnerId
      ? updatedGame.player2.userId
      : updatedGame.player1.userId;
    const totalWin = updatedGame.betAmount * 2;

    const winnerData = await getUser(winnerId);
    if (winnerData) {
      await updateBalance(winnerId, winnerData.balance + totalWin);
      await createTransaction(winnerId, 'win', totalWin);
    }
    await createTransaction(loserId, 'loss', updatedGame.betAmount);
    await updateStats(winnerId, true);
    await updateStats(loserId, false);
  }

  if (updatedGame.status === 'draw') {
    setTimeout(async () => {
      try {
        await updateDoc(gameRef, {
          status: 'choosing',
          'player1.choice': null,
          'player2.choice': null,
        });
      } catch {
        // Game may have been deleted
      }
    }, 2000);
  }
}

function determineWinner(c1: Choice, c2: Choice): 'player1' | 'player2' | 'draw' {
  if (c1 === c2) return 'draw';
  if (
    (c1 === 'pierre' && c2 === 'ciseaux') ||
    (c1 === 'papier' && c2 === 'pierre') ||
    (c1 === 'ciseaux' && c2 === 'papier')
  ) {
    return 'player1';
  }
  return 'player2';
}

export function getRandomChoice(): Choice {
  const choices: Choice[] = ['pierre', 'papier', 'ciseaux'];
  return choices[Math.floor(Math.random() * 3)];
}
