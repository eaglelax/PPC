/**
 * Clean all Firestore collections + Firebase Auth users for testing.
 * Run with: npx ts-node src/scripts/clean-db.ts
 */
import { db, authAdmin } from '../config/firebase';

const COLLECTIONS = ['users', 'otps', 'games', 'waiting_room', 'transactions', 'referral_links', 'bets'];

async function deleteCollection(name: string) {
  const snap = await db.collection(name).get();
  if (snap.empty) {
    console.log(`  ${name}: vide`);
    return 0;
  }
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  ${name}: ${snap.size} docs supprimes`);
  return snap.size;
}

async function deleteAuthUsers() {
  const listResult = await authAdmin.listUsers(1000);
  if (listResult.users.length === 0) {
    console.log('  Auth: aucun utilisateur');
    return;
  }
  const uids = listResult.users.map((u) => u.uid);
  await authAdmin.deleteUsers(uids);
  console.log(`  Auth: ${uids.length} utilisateurs supprimes`);
}

async function main() {
  console.log('Nettoyage de la base de donnees...\n');

  console.log('Collections Firestore:');
  let total = 0;
  for (const col of COLLECTIONS) {
    total += await deleteCollection(col);
  }

  console.log('\nFirebase Auth:');
  await deleteAuthUsers();

  console.log(`\nTermine! ${total} documents supprimes au total.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});
