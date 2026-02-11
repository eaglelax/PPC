import { Router } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { getGame, makeChoice, handleTimeout, cancelStaleGame, cancelActiveGamesForUser } from '../services/gameService';
import { Choice } from '../config/constants';

const router = Router();

const VALID_CHOICES: Choice[] = ['pierre', 'papier', 'ciseaux'];

// POST /api/games/cancel-active — cancel all active games for current user (MUST be before /:id routes)
router.post('/cancel-active', verifyToken, async (req: AuthRequest, res) => {
  try {
    const result = await cancelActiveGamesForUser(req.uid!);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/games/:id
router.get('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const game = await getGame(req.params.id as string);
    if (!game) {
      res.status(404).json({ error: 'Partie introuvable.' });
      return;
    }
    res.json(game);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/games/:id/choice
router.post('/:id/choice', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { choice } = req.body;

    if (!choice) {
      res.status(400).json({ error: 'Choix requis.' });
      return;
    }

    if (!VALID_CHOICES.includes(choice)) {
      res.status(400).json({ error: 'Choix invalide.' });
      return;
    }

    const result = await makeChoice(req.params.id as string, req.uid!, choice);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/games/:id/timeout
router.post('/:id/timeout', verifyToken, async (req: AuthRequest, res) => {
  try {
    const result = await handleTimeout(req.params.id as string, req.uid!);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/games/:id/cancel-stale
router.post('/:id/cancel-stale', verifyToken, async (req: AuthRequest, res) => {
  try {
    const result = await cancelStaleGame(req.params.id as string, req.uid!);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
