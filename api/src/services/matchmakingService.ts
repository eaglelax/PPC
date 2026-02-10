import { db } from '../config/firebase';
import { BetAmount, GAME_FEE } from '../config/constants';
import { createGame } from './gameService';
import { updateBalance, getUser } from './userService';
import { createTransaction } from './transactionService';
import { recordFee } from './feeService';

const WAITING_ROOM = 'waiting_room';

export async function joinWaitingRoom(
  userId: string,
  displayName: string,
  betAmount: BetAmount
) {
  // Verify user has enough balance
  const user = await getUser(userId);
  if (!user) throw new Error('Utilisateur introuvable.');
  if (user.balance < betAmount + GAME_FEE) {
    throw new Error('Solde insuffisant.');
  }

  // Check if user is already waiting
  const existingSnap = await db
    .collection(WAITING_ROOM)
    .where('userId', '==', userId)
    .where('status', '==', 'waiting')
    .get();

  if (!existingSnap.empty) {
    throw new Error('Vous etes deja en file d\'attente.');
  }

  // Deduct bet amount + game fee
  await updateBalance(userId, user.balance - (betAmount + GAME_FEE));
  await createTransaction(userId, 'bet', betAmount, GAME_FEE);
  await recordFee(userId, 'game_fee', GAME_FEE);

  // Look for an opponent with the same bet
  const opponentSnap = await db
    .collection(WAITING_ROOM)
    .where('betAmount', '==', betAmount)
    .where('status', '==', 'waiting')
    .limit(1)
    .get();

  let waitingId: string;
  let gameId: string | null = null;

  if (!opponentSnap.empty) {
    const opponentDoc = opponentSnap.docs[0];
    const opponentData = opponentDoc.data();

    // Don't match with yourself
    if (opponentData.userId !== userId) {
      // Match found - create a game
      gameId = await createGame(
        { userId: opponentData.userId, displayName: opponentData.displayName },
        { userId, displayName },
        betAmount
      );

      // Update opponent's entry
      await opponentDoc.ref.update({ status: 'matched', gameId });

      // Create matched entry for current player
      const ref = await db.collection(WAITING_ROOM).add({
        userId,
        displayName,
        betAmount,
        gameFee: GAME_FEE,
        createdAt: new Date(),
        status: 'matched',
        gameId,
      });
      waitingId = ref.id;

      return { waitingId, gameId, matched: true };
    }
  }

  // No match - join the queue
  const ref = await db.collection(WAITING_ROOM).add({
    userId,
    displayName,
    betAmount,
    gameFee: GAME_FEE,
    createdAt: new Date(),
    status: 'waiting',
  });
  waitingId = ref.id;

  return { waitingId, gameId: null, matched: false };
}

export async function leaveWaitingRoom(userId: string) {
  // Find and delete user's waiting entries
  const snap = await db
    .collection(WAITING_ROOM)
    .where('userId', '==', userId)
    .where('status', '==', 'waiting')
    .get();

  if (snap.empty) return { refunded: false };

  const doc = snap.docs[0];
  const data = doc.data();

  // Refund the bet + game fee
  const refundAmount = data.betAmount + (data.gameFee || 0);
  const user = await getUser(userId);
  if (user) {
    await updateBalance(userId, user.balance + refundAmount);
    await createTransaction(userId, 'refund', refundAmount);
  }

  // Delete all waiting entries
  for (const d of snap.docs) {
    await d.ref.delete();
  }

  return { refunded: true, amount: data.betAmount };
}

export async function getWaitingRoomStats() {
  const snap = await db
    .collection(WAITING_ROOM)
    .where('status', '==', 'waiting')
    .get();
  return {
    waitingCount: snap.size,
    entries: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}
