import { db } from '../config/firebase';
import { getUser, updateBalance } from './userService';
import { createTransaction } from './transactionService';

const SETTINGS = 'settings';
const DEFAULT_WITHDRAWAL_FEE_PERCENT = 5;

export async function getWithdrawalFee(): Promise<{ percent: number }> {
  const snap = await db.collection(SETTINGS).doc('withdrawal_fee').get();
  if (!snap.exists) {
    return { percent: DEFAULT_WITHDRAWAL_FEE_PERCENT };
  }
  return { percent: snap.data()!.percent ?? DEFAULT_WITHDRAWAL_FEE_PERCENT };
}

export async function setWithdrawalFee(percent: number): Promise<void> {
  await db.collection(SETTINGS).doc('withdrawal_fee').set({ percent });
}

export async function withdraw(userId: string, amount: number, method: string, phone: string) {
  if (amount <= 0) throw new Error('Le montant doit etre positif.');

  const user = await getUser(userId);
  if (!user) throw new Error('Utilisateur introuvable.');
  if (user.balance < amount) throw new Error('Solde insuffisant.');

  const { percent } = await getWithdrawalFee();
  const fee = Math.round((amount * percent) / 100);
  const netAmount = amount - fee;

  // Deduct full amount from balance
  await updateBalance(userId, user.balance - amount);
  await createTransaction(userId, 'withdrawal', amount, fee);

  return { amount, fee, netAmount, method, phone };
}
