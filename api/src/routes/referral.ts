import { Router } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { validateReferralCode, getReferralStats } from '../services/referralService';

const router = Router();

// POST /api/referral/validate - Validate a referral code (no auth required for registration flow)
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Code requis.' });
      return;
    }

    const result = await validateReferralCode(code);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/referral/my-code - Get current user's referral code and stats
router.get('/my-code', verifyToken, async (req: AuthRequest, res) => {
  try {
    const stats = await getReferralStats(req.uid!);
    res.json({
      code: stats.code,
      referralsCount: stats.referralsCount,
      pixEarned: stats.totalPixEarned,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/referral/stats - Get detailed referral stats
router.get('/stats', verifyToken, async (req: AuthRequest, res) => {
  try {
    const stats = await getReferralStats(req.uid!);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
