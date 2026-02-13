import admin, { db } from '../config/firebase';

const USERS = 'users';
const REFERRALS = 'referrals';

/**
 * Generate a unique referral code: PPC-XXXXXX
 * Uses chars without ambiguous ones (no I, O, 0, 1)
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PPC-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique code that doesn't exist yet in Firestore
 */
export async function generateUniqueReferralCode(): Promise<string> {
  let code: string;
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    code = generateReferralCode();
    const snap = await db.collection(USERS)
      .where('referralCode', '==', code)
      .limit(1)
      .get();
    exists = !snap.empty;
    attempts++;
  }

  if (exists) {
    throw new Error('Impossible de generer un code unique.');
  }

  return code!;
}

/**
 * Validate a referral code - returns referrer info if valid
 */
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string; referrerName?: string }> {
  if (!code || !code.startsWith('PPC-') || code.length !== 10) {
    return { valid: false };
  }

  const snap = await db.collection(USERS)
    .where('referralCode', '==', code.toUpperCase())
    .limit(1)
    .get();

  if (snap.empty) {
    return { valid: false };
  }

  const referrer = snap.docs[0];
  return {
    valid: true,
    referrerId: referrer.id,
    referrerName: referrer.data().displayName,
  };
}

/**
 * Create a referral relationship between referrer and referee
 */
export async function createReferralLink(referrerId: string, refereeId: string): Promise<void> {
  await db.collection(REFERRALS).add({
    referrerId,
    refereeId,
    createdAt: new Date(),
    rewards: {
      firstRecharge: false,
      lastGameRewardAt: 0,
      fiftyWins: false,
    },
  });

  // Increment referrer's referral count
  await db.collection(USERS).doc(referrerId).update({
    'referralStats.referralsCount': admin.firestore.FieldValue.increment(1),
  });
}

/**
 * Check and grant PIX reward when referee makes first recharge >= 1000F
 */
export async function checkFirstRechargeReward(userId: string, amount: number): Promise<void> {
  if (amount < 1000) return;

  // Find referral where this user is the referee
  const snap = await db.collection(REFERRALS)
    .where('refereeId', '==', userId)
    .limit(1)
    .get();

  if (snap.empty) return;

  const referral = snap.docs[0];
  const data = referral.data();

  if (data.rewards.firstRecharge) return; // Already rewarded

  await grantPixToReferrer(data.referrerId, 10, 'first_recharge', userId);
  await referral.ref.update({ 'rewards.firstRecharge': true });
}

/**
 * Check and grant PIX rewards after a game:
 * - +2 PIX every 10 games played
 * - +20 PIX when referee reaches 50 wins
 */
export async function checkGameMilestoneReward(userId: string): Promise<void> {
  // Find referral where this user is the referee
  const snap = await db.collection(REFERRALS)
    .where('refereeId', '==', userId)
    .limit(1)
    .get();

  if (snap.empty) return;

  const referral = snap.docs[0];
  const referralData = referral.data();

  // Get user stats
  const userSnap = await db.collection(USERS).doc(userId).get();
  if (!userSnap.exists) return;
  const userData = userSnap.data()!;

  const gamesPlayed = userData.stats?.gamesPlayed || 0;
  const wins = userData.stats?.wins || 0;
  const lastRewarded = referralData.rewards.lastGameRewardAt || 0;

  // +2 PIX every 10 games
  const currentMilestone = Math.floor(gamesPlayed / 10) * 10;
  if (currentMilestone > lastRewarded && currentMilestone > 0) {
    const milestonesPassed = (currentMilestone - lastRewarded) / 10;
    await grantPixToReferrer(referralData.referrerId, milestonesPassed * 2, 'games_milestone', userId);
    await referral.ref.update({ 'rewards.lastGameRewardAt': currentMilestone });
  }

  // +20 PIX at 50 wins (one-time)
  if (wins >= 50 && !referralData.rewards.fiftyWins) {
    await grantPixToReferrer(referralData.referrerId, 20, 'fifty_wins', userId);
    await referral.ref.update({ 'rewards.fiftyWins': true });
  }
}

/**
 * Grant PIX to a referrer and update their stats
 */
async function grantPixToReferrer(referrerId: string, amount: number, reason: string, refereeId?: string): Promise<void> {
  await db.collection(USERS).doc(referrerId).update({
    pix: admin.firestore.FieldValue.increment(amount),
    'referralStats.pixEarned': admin.firestore.FieldValue.increment(amount),
  });

  // Log the PIX transaction
  await db.collection('pix_transactions').add({
    userId: referrerId,
    amount,
    reason,
    refereeId: refereeId || null,
    createdAt: new Date(),
  });
}

/**
 * Get referral stats for a user (as referrer)
 */
export async function getReferralStats(userId: string) {
  // Get user's referral code and stats
  const userSnap = await db.collection(USERS).doc(userId).get();
  if (!userSnap.exists) throw new Error('Utilisateur introuvable.');

  const userData = userSnap.data()!;

  // Get all referrals for this user
  const refSnap = await db.collection(REFERRALS)
    .where('referrerId', '==', userId)
    .get();

  const referrals = [];
  for (const refDoc of refSnap.docs) {
    const refData = refDoc.data();
    // Get referee info
    const refereeSnap = await db.collection(USERS).doc(refData.refereeId).get();
    if (!refereeSnap.exists) continue;

    const refereeData = refereeSnap.data()!;
    referrals.push({
      displayName: refereeData.displayName,
      joinedAt: refData.createdAt,
      gamesPlayed: refereeData.stats?.gamesPlayed || 0,
      wins: refereeData.stats?.wins || 0,
      rewards: refData.rewards,
    });
  }

  return {
    code: userData.referralCode || null,
    referralsCount: userData.referralStats?.referralsCount || 0,
    totalPixEarned: userData.referralStats?.pixEarned || 0,
    referrals,
  };
}
