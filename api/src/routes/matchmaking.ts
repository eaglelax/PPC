import { Router } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { joinWaitingRoom, leaveWaitingRoom } from '../services/matchmakingService';
import { getUser } from '../services/userService';
import { BET_AMOUNTS, BetAmount } from '../config/constants';

const router = Router();

// POST /api/matchmaking/join
router.post('/join', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { betAmount } = req.body;
    const numBet = Number(betAmount) as BetAmount;

    if (!BET_AMOUNTS.includes(numBet)) {
      res.status(400).json({ error: 'Montant de mise invalide.' });
      return;
    }

    const user = await getUser(req.uid!);
    if (!user) {
      res.status(404).json({ error: 'Profil introuvable.' });
      return;
    }

    const result = await joinWaitingRoom(req.uid!, user.displayName, numBet);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/matchmaking/leave
router.post('/leave', verifyToken, async (req: AuthRequest, res) => {
  try {
    const result = await leaveWaitingRoom(req.uid!);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
