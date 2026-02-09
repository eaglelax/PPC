import { db } from '../config/firebase';
import { Choice } from '../config/constants';
import { updateBalance, getUser, updateStats } from './userService';
import { createTransaction } from './transactionService';

const GAMES = 'games';

export async function createGame(
  player1: { userId: string; displayName: string },
  player2: { userId: string; displayName: string },
  betAmount: number
): Promise<string> {
  const ref = await db.collection(GAMES).add({
    player1: { userId: player1.userId, displayName: player1.displayName, choice: null },
    player2: { userId: player2.userId, displayName: player2.displayName, choice: null },
    betAmount,
    status: 'choosing',
    winner: null,
    round: 1,
    createdAt: new Date(),
  });
  return ref.id;
}

export async function getGame(gameId: string) {
  const snap = await db.collection(GAMES).doc(gameId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as any;
}

export async function makeChoice(gameId: string, userId: string, choice: Choice) {
  const gameRef = db.collection(GAMES).doc(gameId);

  // Use Firestore transaction for atomicity
  const result = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(gameRef);
    if (!snap.exists) throw new Error('Partie introuvable.');

    const game = snap.data()!;

    if (game.status === 'resolved') {
      throw new Error('Partie deja terminee.');
    }

    const isPlayer1 = game.player1.userId === userId;
    const isPlayer2 = game.player2.userId === userId;
    if (!isPlayer1 && !isPlayer2) {
      throw new Error('Vous ne participez pas a cette partie.');
    }

    const choiceField = isPlayer1 ? 'player1.choice' : 'player2.choice';
    const otherChoice = isPlayer1 ? game.player2.choice : game.player1.choice;

    if (!otherChoice) {
      // Other player hasn't chosen yet
      transaction.update(gameRef, { [choiceField]: choice });
      return { status: 'waiting' };
    }

    // Both players have chosen - resolve
    const p1Choice = isPlayer1 ? choice : otherChoice;
    const p2Choice = isPlayer1 ? otherChoice : choice;
    const winner = determineWinner(p1Choice, p2Choice);

    if (winner === 'draw') {
      transaction.update(gameRef, {
        [choiceField]: choice,
        status: 'draw',
        round: (game.round || 1) + 1,
      });
      return { status: 'draw', round: (game.round || 1) + 1 };
    }

    const winnerId = winner === 'player1' ? game.player1.userId : game.player2.userId;
    transaction.update(gameRef, {
      [choiceField]: choice,
      status: 'resolved',
      winner: winnerId,
    });

    return {
      status: 'resolved',
      winnerId,
      loserId: winner === 'player1' ? game.player2.userId : game.player1.userId,
      betAmount: game.betAmount,
    };
  });

  // Process payouts outside the transaction
  if (result.status === 'resolved') {
    const { winnerId, loserId, betAmount } = result as any;
    const totalWin = betAmount * 2;

    const winnerData = await getUser(winnerId);
    if (winnerData) {
      await updateBalance(winnerId, winnerData.balance + totalWin);
      await createTransaction(winnerId, 'win', totalWin);
    }
    await createTransaction(loserId, 'loss', betAmount);
    await updateStats(winnerId, true);
    await updateStats(loserId, false);
  }

  if (result.status === 'draw') {
    // Reset choices after delay for next round
    setTimeout(async () => {
      try {
        await gameRef.update({
          status: 'choosing',
          'player1.choice': null,
          'player2.choice': null,
        });
      } catch {
        // Game may have been deleted
      }
    }, 2000);
  }

  return result;
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

export async function getAllGames(limitCount: number = 50) {
  const snap = await db
    .collection(GAMES)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getActiveGames() {
  const snap = await db
    .collection(GAMES)
    .where('status', 'in', ['choosing', 'draw'])
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getGameStats() {
  const allGames = await db.collection(GAMES).get();
  let total = 0;
  let resolved = 0;
  let active = 0;
  let totalBetVolume = 0;

  allGames.forEach((doc) => {
    const data = doc.data();
    total++;
    totalBetVolume += data.betAmount || 0;
    if (data.status === 'resolved') resolved++;
    else active++;
  });

  return { total, resolved, active, totalBetVolume };
}
