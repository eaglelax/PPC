import { Router } from 'express';
import { getWithdrawalFee, setWithdrawalFee } from '../services/walletService';

const router = Router();

// GET /api/settings/withdrawal_fee - Get withdrawal fee percentage (public)
router.get('/withdrawal_fee', async (_req, res) => {
  try {
    const fee = await getWithdrawalFee();
    res.json(fee);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/settings/withdrawal_fee - Update withdrawal fee (admin)
router.put('/withdrawal_fee', async (req, res) => {
  try {
    const { percent } = req.body;
    const numPercent = Number(percent);

    if (isNaN(numPercent) || numPercent < 0 || numPercent > 100) {
      res.status(400).json({ error: 'Pourcentage invalide (0-100).' });
      return;
    }

    await setWithdrawalFee(numPercent);
    res.json({ success: true, percent: numPercent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
