import { db } from '../config/firebase';
import { RECHARGE_FEE, TransactionType } from '../config/constants';
import { updateBalance, getUser } from './userService';

const TRANSACTIONS = 'transactions';

export async function createTransaction(
  userId: string,
  type: TransactionType,
  amount: number,
  fee: number = 0
) {
  const ref = await db.collection(TRANSACTIONS).add({
    userId,
    type,
    amount,
    fee,
    createdAt: new Date(),
  });
  return ref.id;
}

export async function rechargeBalance(userId: string, amount: number) {
  const user = await getUser(userId);
  if (!user) throw new Error('Utilisateur introuvable.');

  if (amount <= RECHARGE_FEE) {
    throw new Error(`Le montant doit etre superieur a ${RECHARGE_FEE}F.`);
  }

  const netAmount = amount - RECHARGE_FEE;
  const newBalance = user.balance + netAmount;

  await updateBalance(userId, newBalance);
  await createTransaction(userId, 'recharge', amount, RECHARGE_FEE);

  return { newBalance, netAmount, fee: RECHARGE_FEE };
}

export async function getUserTransactions(userId: string) {
  const snap = await db
    .collection(TRANSACTIONS)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllTransactions(limitCount: number = 100) {
  const snap = await db
    .collection(TRANSACTIONS)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTransactionStats() {
  const allTx = await db.collection(TRANSACTIONS).get();
  let totalRecharges = 0;
  let totalBets = 0;
  let totalFees = 0;
  let count = 0;

  allTx.forEach((doc) => {
    const data = doc.data();
    count++;
    if (data.type === 'recharge') {
      totalRecharges += data.amount || 0;
      totalFees += data.fee || 0;
    }
    if (data.type === 'bet') {
      totalBets += data.amount || 0;
    }
  });

  return { totalRecharges, totalBets, totalFees, count };
}
