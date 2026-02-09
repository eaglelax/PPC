import { Router } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { withdraw } from '../services/walletService';

const router = Router();

// POST /api/wallet/withdraw - Withdraw funds
router.post('/withdraw', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { amount, method, phone } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: 'Montant invalide.' });
      return;
    }

    if (!method || !['Orange', 'MTN', 'Moov'].includes(method)) {
      res.status(400).json({ error: 'Methode de paiement invalide.' });
      return;
    }

    if (!phone || phone.length < 8) {
      res.status(400).json({ error: 'Numero de telephone invalide.' });
      return;
    }

    const result = await withdraw(req.uid!, numAmount, method, phone);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
