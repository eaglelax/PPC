import { Router } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { getGame, makeChoice, getRandomChoice } from '../services/gameService';
import { Choice } from '../config/constants';

const router = Router();

const VALID_CHOICES: Choice[] = ['pierre', 'papier', 'ciseaux'];

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
    let { choice } = req.body;

    // If no choice (timeout), pick random
    if (!choice) {
      choice = getRandomChoice();
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

export default router;
