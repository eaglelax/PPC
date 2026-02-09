import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction } from '../types';
import { updateBalance } from './userService';
import { RECHARGE_FEE } from '../config/theme';

const TRANSACTIONS_COLLECTION = 'transactions';

export async function createTransaction(
  userId: string,
  type: Transaction['type'],
  amount: number,
  fee: number = 0
): Promise<void> {
  await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
    userId,
    type,
    amount,
    fee,
    createdAt: serverTimestamp(),
  });
}

export async function rechargeBalance(
  userId: string,
  currentBalance: number,
  amount: number
): Promise<number> {
  const fee = RECHARGE_FEE;
  const netAmount = amount - fee;
  const newBalance = currentBalance + netAmount;

  await updateBalance(userId, newBalance);
  await createTransaction(userId, 'recharge', amount, fee);

  return newBalance;
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ odId: d.id, ...d.data() } as Transaction));
}
