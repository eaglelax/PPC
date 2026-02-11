import { db } from '../config/firebase';
import { MIN_WITHDRAWAL } from '../config/constants';
import { getUser, updateBalance } from './userService';
import { createTransaction } from './transactionService';
import { recordFee } from './feeService';
import {
  createDisbursement,
  createDemoDisbursement,
  getGeniusPayConfig,
  isGeniusPayEnabled,
} from './geniusPayService';

const SETTINGS = 'settings';
const DEFAULT_WITHDRAWAL_FEE_PERCENT = 2;

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
  if (amount < MIN_WITHDRAWAL) throw new Error(`Le montant minimum de retrait est de ${MIN_WITHDRAWAL}F.`);

  const user = await getUser(userId);
  if (!user) throw new Error('Utilisateur introuvable.');
  if (user.balance < amount) throw new Error('Solde insuffisant.');

  const { percent } = await getWithdrawalFee();
  const fee = Math.round((amount * percent) / 100);
  const netAmount = amount - fee;

  // Deduct full amount from balance
  await updateBalance(userId, user.balance - amount);
  await createTransaction(userId, 'withdrawal', amount, fee);
  if (fee > 0) {
    await recordFee(userId, 'withdrawal_fee', fee);
  }

  // Initiate payout via GeniusPay
  let payoutStatus: 'processing' | 'pending_manual' = 'pending_manual';
  let payoutReference = '';

  if (isGeniusPayEnabled()) {
    try {
      const config = getGeniusPayConfig();
      const disbursement = await createDisbursement(config, {
        amount: netAmount,
        phone,
        description: `Retrait P2C - ${netAmount}F`,
        metadata: { userId, type: 'withdrawal' },
      });
      payoutReference = disbursement.reference;
      payoutStatus = 'processing';
    } catch (error: any) {
      console.error('[Withdraw] GeniusPay disbursement failed, marking as pending_manual:', error.message);
      payoutStatus = 'pending_manual';
    }
  } else {
    // Demo mode
    const demo = createDemoDisbursement(netAmount, phone);
    payoutReference = demo.reference;
    payoutStatus = 'processing';
  }

  // Save withdrawal record to Firestore
  await db.collection('withdrawals').doc(payoutReference || `WD-${Date.now()}`).set({
    userId,
    amount,
    fee,
    netAmount,
    phone,
    method,
    payoutReference,
    payoutStatus,
    createdAt: new Date(),
  });

  return { amount, fee, netAmount, method, phone, payoutStatus, payoutReference };
}
