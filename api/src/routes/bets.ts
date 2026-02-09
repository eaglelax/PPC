import { Router } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { getAvailableBets, createBet, joinBet, cancelBet } from '../services/betService';
import { getUser } from '../services/userService';

const router = Router();

// GET /api/bets - List available bets
router.get('/', async (_req, res) => {
  try {
    const bets = await getAvailableBets();
    res.json(bets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bets - Create a new bet
router.post('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount < 1000) {
      res.status(400).json({ error: 'Le montant minimum est de 1000F.' });
      return;
    }

    const user = await getUser(req.uid!);
    if (!user) {
      res.status(404).json({ error: 'Profil introuvable.' });
      return;
    }

    const result = await createBet(req.uid!, user.displayName, numAmount);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/bets/:id/join - Join an existing bet
router.post('/:id/join', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await getUser(req.uid!);
    if (!user) {
      res.status(404).json({ error: 'Profil introuvable.' });
      return;
    }

    const result = await joinBet(req.params.id as string, req.uid!, user.displayName);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/bets/:id - Cancel own bet
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const result = await cancelBet(req.params.id as string, req.uid!);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
