import { db } from '../config/firebase';
import { updateBalance, getUser, updateStats } from './userService';
import { createTransaction } from './transactionService';

const GAMES = 'games';
const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const CLEANUP_INTERVAL_MS = 30 * 1000; // Run every 30 seconds

async function refundPlayer(userId: string, betAmount: number) {
  const user = await getUser(userId);
  if (user) {
    await updateBalance(userId, user.balance + betAmount);
    await createTransaction(userId, 'refund', betAmount);
  }
}

async function cleanupStaleGames() {
  try {
    const now = Date.now();

    // Find all games in 'choosing' or 'draw' status
    const choosingSnap = await db
      .collection(GAMES)
      .where('status', 'in', ['choosing', 'draw'])
      .get();

    for (const doc of choosingSnap.docs) {
      const game = doc.data();
      const gameRef = db.collection(GAMES).doc(doc.id);

      const choosingStartedAt = game.choosingStartedAt?.toDate?.()
        || game.choosingStartedAt;
      const createdAt = game.createdAt?.toDate?.() || game.createdAt;
      const referenceTime = choosingStartedAt || createdAt;

      if (!referenceTime) continue;

      const elapsed = now - new Date(referenceTime).getTime();

      if (elapsed >= STALE_THRESHOLD_MS) {
        // Use transaction to safely cancel
        try {
          await db.runTransaction(async (transaction) => {
            const snap = await transaction.get(gameRef);
            if (!snap.exists) return;

            const currentGame = snap.data()!;
            if (currentGame.status !== 'choosing' && currentGame.status !== 'draw') {
              return; // Already resolved/cancelled
            }

            transaction.update(gameRef, {
              status: 'cancelled',
              cancelledBy: 'server_cleanup',
              cancelledAt: new Date(),
            });
          });

          // Refund both players outside transaction
          await refundPlayer(game.player1.userId, game.betAmount);
          await refundPlayer(game.player2.userId, game.betAmount);

          console.log(`[Cleanup] Cancelled stale game ${doc.id} (inactive ${Math.round(elapsed / 1000)}s)`);
        } catch (err: any) {
          console.error(`[Cleanup] Failed to cancel game ${doc.id}:`, err.message);
        }
      }
    }
  } catch (err: any) {
    console.error('[Cleanup] Error during stale game scan:', err.message);
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startGameCleanup() {
  if (cleanupTimer) return;

  console.log('[Cleanup] Starting stale game cleanup (every 30s)');
  // Run immediately on start
  cleanupStaleGames();
  // Then run periodically
  cleanupTimer = setInterval(cleanupStaleGames, CLEANUP_INTERVAL_MS);
}

export function stopGameCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('[Cleanup] Stopped stale game cleanup');
  }
}
