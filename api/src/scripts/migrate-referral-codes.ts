/**
 * Migration script: Add referralCode, referredBy, and referralStats to existing users.
 *
 * Run with: npx ts-node src/scripts/migrate-referral-codes.ts
 */
import { db } from '../config/firebase';
import { generateReferralCode } from '../services/referralService';

async function migrate() {
  console.log('Starting referral code migration...');

  const usersSnap = await db.collection('users').get();
  let updated = 0;
  let skipped = 0;
  const usedCodes = new Set<string>();

  for (const doc of usersSnap.docs) {
    const data = doc.data();

    if (data.referralCode) {
      skipped++;
      usedCodes.add(data.referralCode);
      continue;
    }

    // Generate a unique code
    let code: string;
    do {
      code = generateReferralCode();
    } while (usedCodes.has(code));
    usedCodes.add(code);

    await doc.ref.update({
      referralCode: code,
      referredBy: null,
      referralStats: { referralsCount: 0, pixEarned: 0 },
    });

    updated++;
    console.log(`  [${updated}] ${doc.id} -> ${code}`);
  }

  console.log(`\nMigration complete: ${updated} updated, ${skipped} skipped (already had code).`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
