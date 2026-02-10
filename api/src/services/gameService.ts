import admin, { db } from '../config/firebase';
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
    timeoutCount: 0,
    choosingStartedAt: new Date(),
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

    if (game.status !== 'choosing') {
      throw new Error('La partie n\'est pas en phase de choix.');
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
        'player1.choice': null,
        'player2.choice': null,
        status: 'draw',
        round: (game.round || 1) + 1,
        timeoutCount: 0,
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
    await db.collection('users').doc(winnerId).update({
      pix: admin.firestore.FieldValue.increment(1),
    });
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
          choosingStartedAt: new Date(),
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

async function refundPlayer(userId: string, betAmount: number) {
  const user = await getUser(userId);
  if (user) {
    await updateBalance(userId, user.balance + betAmount);
    await createTransaction(userId, 'refund', betAmount);
  }
}

export async function handleTimeout(gameId: string, userId: string) {
  const gameRef = db.collection(GAMES).doc(gameId);

  const result = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(gameRef);
    if (!snap.exists) throw new Error('Partie introuvable.');

    const game = snap.data()!;

    if (game.status !== 'choosing') {
      throw new Error('La partie n\'est pas en phase de choix.');
    }

    const isPlayer1 = game.player1.userId === userId;
    const isPlayer2 = game.player2.userId === userId;
    if (!isPlayer1 && !isPlayer2) {
      throw new Error('Vous ne participez pas a cette partie.');
    }

    const myChoice = isPlayer1 ? game.player1.choice : game.player2.choice;
    if (myChoice) {
      throw new Error('Vous avez deja fait votre choix.');
    }

    const newTimeoutCount = (game.timeoutCount || 0) + 1;

    if (newTimeoutCount >= 3) {
      // Too many timeouts - cancel the game
      transaction.update(gameRef, {
        status: 'cancelled',
        'player1.choice': null,
        'player2.choice': null,
        timeoutCount: newTimeoutCount,
      });
      return {
        status: 'cancelled' as const,
        player1Id: game.player1.userId,
        player2Id: game.player2.userId,
        betAmount: game.betAmount,
      };
    }

    // Reset round like a draw
    transaction.update(gameRef, {
      'player1.choice': null,
      'player2.choice': null,
      status: 'draw',
      round: (game.round || 1) + 1,
      timeoutCount: newTimeoutCount,
    });
    return { status: 'draw' as const, round: (game.round || 1) + 1 };
  });

  if (result.status === 'cancelled') {
    const { player1Id, player2Id, betAmount } = result as any;
    await refundPlayer(player1Id, betAmount);
    await refundPlayer(player2Id, betAmount);
    return result;
  }

  // Draw-like reset: after 2s go back to choosing
  if (result.status === 'draw') {
    setTimeout(async () => {
      try {
        await gameRef.update({
          status: 'choosing',
          'player1.choice': null,
          'player2.choice': null,
          choosingStartedAt: new Date(),
        });
      } catch {
        // Game may have been deleted/cancelled
      }
    }, 2000);
  }

  return result;
}

export async function cancelStaleGame(gameId: string, userId: string) {
  const gameRef = db.collection(GAMES).doc(gameId);

  const result = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(gameRef);
    if (!snap.exists) throw new Error('Partie introuvable.');

    const game = snap.data()!;

    const isPlayer1 = game.player1.userId === userId;
    const isPlayer2 = game.player2.userId === userId;
    if (!isPlayer1 && !isPlayer2) {
      throw new Error('Vous ne participez pas a cette partie.');
    }

    if (game.status !== 'choosing') {
      throw new Error('La partie n\'est pas en phase de choix.');
    }

    const choosingStartedAt = game.choosingStartedAt?.toDate?.() || game.choosingStartedAt;
    if (!choosingStartedAt) {
      throw new Error('Impossible de verifier la duree du tour.');
    }

    const elapsed = Date.now() - new Date(choosingStartedAt).getTime();
    if (elapsed < 2 * 60 * 1000) {
      throw new Error('La partie n\'est pas encore consideree comme inactive.');
    }

    transaction.update(gameRef, {
      status: 'cancelled',
      'player1.choice': null,
      'player2.choice': null,
    });

    return {
      player1Id: game.player1.userId,
      player2Id: game.player2.userId,
      betAmount: game.betAmount,
    };
  });

  await refundPlayer(result.player1Id, result.betAmount);
  await refundPlayer(result.player2Id, result.betAmount);

  return { status: 'cancelled' };
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
