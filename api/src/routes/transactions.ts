import { Router } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { rechargeBalance, getUserTransactions } from '../services/transactionService';

const router = Router();

// POST /api/transactions/recharge
router.post('/recharge', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: 'Montant invalide.' });
      return;
    }

    const result = await rechargeBalance(req.uid!, numAmount);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/transactions/history
router.get('/history', verifyToken, async (req: AuthRequest, res) => {
  try {
    const transactions = await getUserTransactions(req.uid!);
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
