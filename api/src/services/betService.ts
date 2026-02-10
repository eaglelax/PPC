import { db } from '../config/firebase';
import { MIN_BET_AMOUNT, GAME_FEE, BetStatus } from '../config/constants';
import { getUser, updateBalance } from './userService';
import { createTransaction } from './transactionService';
import { createGame } from './gameService';
import { recordFee } from './feeService';

const BETS = 'bets';

export async function getAvailableBets() {
  const snap = await db
    .collection(BETS)
    .where('status', '==', 'waiting')
    .orderBy('amount', 'asc')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createBet(userId: string, displayName: string, amount: number) {
  if (amount < MIN_BET_AMOUNT) {
    throw new Error(`Le montant minimum est de ${MIN_BET_AMOUNT}F.`);
  }

  const user = await getUser(userId);
  if (!user) throw new Error('Utilisateur introuvable.');
  if (user.balance < amount + GAME_FEE) throw new Error('Solde insuffisant.');

  // Check if user already has a waiting bet
  const existingSnap = await db
    .collection(BETS)
    .where('creatorId', '==', userId)
    .where('status', '==', 'waiting')
    .get();

  if (!existingSnap.empty) {
    throw new Error('Vous avez deja un pari en attente.');
  }

  // Deduct balance (bet amount + game fee)
  await updateBalance(userId, user.balance - (amount + GAME_FEE));
  await createTransaction(userId, 'bet', amount, GAME_FEE);
  await recordFee(userId, 'game_fee', GAME_FEE);

  // Create bet document
  const ref = await db.collection(BETS).add({
    creatorId: userId,
    creatorName: displayName,
    amount,
    gameFee: GAME_FEE,
    status: 'waiting' as BetStatus,
    createdAt: new Date(),
  });

  return { betId: ref.id };
}

export async function joinBet(betId: string, userId: string, displayName: string) {
  const betRef = db.collection(BETS).doc(betId);
  const betSnap = await betRef.get();

  if (!betSnap.exists) throw new Error('Pari introuvable.');

  const bet = betSnap.data()!;
  if (bet.status !== 'waiting') throw new Error('Ce pari n\'est plus disponible.');
  if (bet.creatorId === userId) throw new Error('Vous ne pouvez pas rejoindre votre propre pari.');

  const user = await getUser(userId);
  if (!user) throw new Error('Utilisateur introuvable.');
  if (user.balance < bet.amount + GAME_FEE) throw new Error('Solde insuffisant.');

  // Deduct balance (bet amount + game fee)
  await updateBalance(userId, user.balance - (bet.amount + GAME_FEE));
  await createTransaction(userId, 'bet', bet.amount, GAME_FEE);
  await recordFee(userId, 'game_fee', GAME_FEE);

  // Create game
  const gameId = await createGame(
    { userId: bet.creatorId, displayName: bet.creatorName },
    { userId, displayName },
    bet.amount
  );

  // Update bet status
  await betRef.update({
    status: 'matched' as BetStatus,
    opponentId: userId,
    opponentName: displayName,
    gameId,
    matchedAt: new Date(),
  });

  return { gameId };
}

export async function cancelBet(betId: string, userId: string) {
  const betRef = db.collection(BETS).doc(betId);
  const betSnap = await betRef.get();

  if (!betSnap.exists) throw new Error('Pari introuvable.');

  const bet = betSnap.data()!;
  if (bet.creatorId !== userId) throw new Error('Vous n\'etes pas le createur de ce pari.');
  if (bet.status !== 'waiting') throw new Error('Ce pari ne peut plus etre annule.');

  // Refund (bet amount + game fee)
  const refundAmount = bet.amount + (bet.gameFee || 0);
  const user = await getUser(userId);
  if (user) {
    await updateBalance(userId, user.balance + refundAmount);
    await createTransaction(userId, 'refund', refundAmount);
  }

  // Update status
  await betRef.update({ status: 'cancelled' as BetStatus });

  return { refunded: true, amount: bet.amount };
}
