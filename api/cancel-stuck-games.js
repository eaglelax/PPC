/**
 * One-time script to cancel all stale/stuck games and bets in Firestore.
 * Refunds both players for each stuck game, and the creator for each stuck bet.
 *
 * Run from the api/ directory: node cancel-stuck-games.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccountPath = path.resolve(__dirname, '..', 'ppc-game-8b35f-firebase-adminsdk-fbsvc-58d6d621e2.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function getUser(uid) {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return null;
  return snap.data();
}

async function updateBalance(uid, newBalance) {
  await db.collection('users').doc(uid).update({ balance: newBalance });
}

async function createTransaction(userId, type, amount, fee = 0) {
  const ref = await db.collection('transactions').add({
    userId,
    type,
    amount,
    fee,
    createdAt: new Date(),
  });
  return ref.id;
}

async function refundPlayer(userId, betAmount, reason) {
  const user = await getUser(userId);
  if (user) {
    const newBalance = user.balance + betAmount;
    await updateBalance(userId, newBalance);
    await createTransaction(userId, 'refund', betAmount);
    console.log(`  [REFUND] Player ${userId} (${user.displayName || 'unknown'}): +${betAmount}F (balance: ${user.balance} -> ${newBalance}) [${reason}]`);
    return true;
  } else {
    console.log(`  [WARN] Player ${userId} not found in users collection, skipping refund of ${betAmount}F`);
    return false;
  }
}

async function cancelStuckGames() {
  console.log('=== CANCELLING STUCK GAMES ===\n');

  // Firestore 'in' queries support up to 10 values
  // Stuck statuses: anything that is NOT 'resolved' and NOT 'cancelled'
  const stuckStatuses = ['choosing', 'waiting', 'draw', 'matched'];

  const snap = await db.collection('games')
    .where('status', 'in', stuckStatuses)
    .get();

  console.log(`Found ${snap.size} stuck game(s).\n`);

  let cancelledCount = 0;
  let refundedAmount = 0;

  for (const doc of snap.docs) {
    const game = doc.data();
    const gameId = doc.id;
    const p1 = game.player1;
    const p2 = game.player2;
    const betAmount = game.betAmount || 0;

    console.log(`Game ${gameId}:`);
    console.log(`  Status: ${game.status}`);
    console.log(`  Bet: ${betAmount}F`);
    console.log(`  Player1: ${p1?.displayName || p1?.userId || 'unknown'}`);
    console.log(`  Player2: ${p2?.displayName || p2?.userId || 'unknown'}`);

    const createdAt = game.createdAt?.toDate?.() || game.createdAt;
    if (createdAt) {
      console.log(`  Created: ${createdAt}`);
    }

    try {
      // Cancel the game
      await db.collection('games').doc(gameId).update({
        status: 'cancelled',
        cancelledBy: 'admin_script',
        cancelledAt: new Date(),
      });

      // Refund player 1
      if (p1?.userId && betAmount > 0) {
        await refundPlayer(p1.userId, betAmount, 'game cancel');
        refundedAmount += betAmount;
      }

      // Refund player 2
      if (p2?.userId && betAmount > 0) {
        await refundPlayer(p2.userId, betAmount, 'game cancel');
        refundedAmount += betAmount;
      }

      cancelledCount++;
      console.log(`  -> CANCELLED\n`);
    } catch (err) {
      console.error(`  -> ERROR: ${err.message}\n`);
    }
  }

  console.log(`Games: cancelled ${cancelledCount}, total refunded: ${refundedAmount}F\n`);
  return { cancelledCount, refundedAmount };
}

async function cancelStuckBets() {
  console.log('=== CANCELLING STUCK BETS ===\n');

  const stuckStatuses = ['waiting', 'matched'];

  const snap = await db.collection('bets')
    .where('status', 'in', stuckStatuses)
    .get();

  console.log(`Found ${snap.size} stuck bet(s).\n`);

  let cancelledCount = 0;
  let refundedAmount = 0;

  for (const doc of snap.docs) {
    const bet = doc.data();
    const betId = doc.id;
    const amount = bet.amount || 0;
    const gameFee = bet.gameFee || 0;

    console.log(`Bet ${betId}:`);
    console.log(`  Status: ${bet.status}`);
    console.log(`  Amount: ${amount}F (fee: ${gameFee}F)`);
    console.log(`  Creator: ${bet.creatorName || bet.creatorId || 'unknown'} (${bet.creatorId})`);

    if (bet.opponentId) {
      console.log(`  Opponent: ${bet.opponentName || bet.opponentId} (${bet.opponentId})`);
    }

    const createdAt = bet.createdAt?.toDate?.() || bet.createdAt;
    if (createdAt) {
      console.log(`  Created: ${createdAt}`);
    }

    try {
      // Cancel the bet
      await db.collection('bets').doc(betId).update({
        status: 'cancelled',
        cancelledBy: 'admin_script',
        cancelledAt: new Date(),
      });

      if (bet.status === 'waiting') {
        // Only creator has been charged; refund bet amount + game fee
        const refundTotal = amount + gameFee;
        if (bet.creatorId && refundTotal > 0) {
          await refundPlayer(bet.creatorId, refundTotal, 'waiting bet cancel');
          refundedAmount += refundTotal;
        }
      } else if (bet.status === 'matched') {
        // Both players have been charged, but a game should exist for this bet.
        // The game refund is handled in cancelStuckGames.
        // However, if the game was already resolved/cancelled, we should NOT double-refund.
        // Check if there's an associated game that was already handled.
        if (bet.gameId) {
          const gameSnap = await db.collection('games').doc(bet.gameId).get();
          if (gameSnap.exists) {
            const gameData = gameSnap.data();
            if (gameData.status === 'cancelled' || gameData.status === 'resolved') {
              console.log(`  -> Game ${bet.gameId} already ${gameData.status}, no additional refund needed for matched bet`);
            } else {
              // Game is still stuck - it will be/was handled by cancelStuckGames
              console.log(`  -> Game ${bet.gameId} is ${gameData.status}, refund handled via game cancellation`);
            }
          } else {
            // Game doesn't exist - refund both players
            console.log(`  -> Game ${bet.gameId} not found! Refunding both players from bet.`);
            if (bet.creatorId && amount > 0) {
              await refundPlayer(bet.creatorId, amount + gameFee, 'orphan matched bet');
              refundedAmount += amount + gameFee;
            }
            if (bet.opponentId && amount > 0) {
              await refundPlayer(bet.opponentId, amount + gameFee, 'orphan matched bet');
              refundedAmount += amount + gameFee;
            }
          }
        } else {
          // Matched but no gameId - refund both
          console.log(`  -> Matched bet with no gameId! Refunding both players.`);
          if (bet.creatorId && amount > 0) {
            await refundPlayer(bet.creatorId, amount + gameFee, 'orphan matched bet no gameId');
            refundedAmount += amount + gameFee;
          }
          if (bet.opponentId && amount > 0) {
            await refundPlayer(bet.opponentId, amount + gameFee, 'orphan matched bet no gameId');
            refundedAmount += amount + gameFee;
          }
        }
      }

      cancelledCount++;
      console.log(`  -> CANCELLED\n`);
    } catch (err) {
      console.error(`  -> ERROR: ${err.message}\n`);
    }
  }

  console.log(`Bets: cancelled ${cancelledCount}, total refunded: ${refundedAmount}F\n`);
  return { cancelledCount, refundedAmount };
}

async function main() {
  console.log('======================================');
  console.log('  PPC Game - Cancel Stuck Games/Bets');
  console.log('  ' + new Date().toISOString());
  console.log('======================================\n');

  const gameResult = await cancelStuckGames();
  const betResult = await cancelStuckBets();

  console.log('=== SUMMARY ===');
  console.log(`Games cancelled: ${gameResult.cancelledCount}, refunded: ${gameResult.refundedAmount}F`);
  console.log(`Bets cancelled: ${betResult.cancelledCount}, refunded: ${betResult.refundedAmount}F`);
  console.log(`Total refunded: ${gameResult.refundedAmount + betResult.refundedAmount}F`);
  console.log('\nDone.');

  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
