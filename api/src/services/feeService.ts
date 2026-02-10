import { db } from '../config/firebase';

const FEES = 'fees';

type FeeType = 'game_fee' | 'withdrawal_fee';

export async function recordFee(
  userId: string,
  feeType: FeeType,
  amount: number,
  relatedId?: string
) {
  const data: Record<string, any> = {
    userId,
    feeType,
    amount,
    createdAt: new Date(),
  };
  if (relatedId) data.relatedId = relatedId;

  await db.collection(FEES).add(data);
}
