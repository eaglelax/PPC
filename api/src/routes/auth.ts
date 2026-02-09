import { Router } from 'express';
import { authAdmin } from '../config/firebase';
import { createUser, getUser } from '../services/userService';
import { AuthRequest, verifyToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/register - Create user profile after Firebase Auth signup
router.post('/register', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { displayName } = req.body;
    const uid = req.uid!;

    if (!displayName || !displayName.trim()) {
      res.status(400).json({ error: 'Pseudo requis.' });
      return;
    }

    // Get email from Firebase Auth
    const firebaseUser = await authAdmin.getUser(uid);
    const user = await createUser(uid, firebaseUser.email || '', displayName.trim());

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', verifyToken, async (req: AuthRequest, res) => {
  try {
    const user = await getUser(req.uid!);
    if (!user) {
      res.status(404).json({ error: 'Profil introuvable.' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
