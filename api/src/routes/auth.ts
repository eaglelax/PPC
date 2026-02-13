import { Router } from 'express';
import { authAdmin } from '../config/firebase';
import { createUser, getUser } from '../services/userService';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { validateReferralCode, createReferralLink } from '../services/referralService';
import { sendOtp, verifyOtp } from '../services/otpService';

const router = Router();

// POST /api/auth/send-otp - Send OTP to phone (public, no auth)
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, isRegistration } = req.body;
    if (!phone || typeof phone !== 'string') {
      res.status(400).json({ error: 'Numero de telephone requis.' });
      return;
    }
    const result = await sendOtp(phone, !!isRegistration);
    // In test mode, return the code so the mobile can display it
    res.json({ success: true, code: result.code });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/verify-otp - Verify OTP and return custom token (public, no auth)
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ error: 'Telephone et code requis.' });
      return;
    }

    await verifyOtp(phone, otp);

    // Normalize phone for Firebase lookup
    const normalizedPhone = phone.replace(/[\s\-()]/g, '');
    const fullPhone = normalizedPhone.startsWith('+') ? normalizedPhone : '+226' + normalizedPhone;

    // Find or create Firebase Auth user by phone
    let uid: string;
    let isNewUser = false;
    try {
      const existingUser = await authAdmin.getUserByPhoneNumber(fullPhone);
      uid = existingUser.uid;
    } catch {
      // User doesn't exist in Firebase Auth, create one
      const newUser = await authAdmin.createUser({ phoneNumber: fullPhone });
      uid = newUser.uid;
      isNewUser = true;
    }

    // Generate custom token
    const token = await authAdmin.createCustomToken(uid);

    res.json({ token, isNewUser });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/register - Create user profile after OTP verification
router.post('/register', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { displayName, email, referralCode } = req.body;
    const uid = req.uid!;

    if (!displayName || !displayName.trim()) {
      res.status(400).json({ error: 'Pseudo requis.' });
      return;
    }

    // Validate referral code if provided
    let referredBy: string | null = null;
    if (referralCode && referralCode.trim()) {
      const validation = await validateReferralCode(referralCode.trim());
      if (!validation.valid) {
        res.status(400).json({ error: 'Code parrain invalide.' });
        return;
      }
      // Prevent self-referral
      if (validation.referrerId === uid) {
        res.status(400).json({ error: 'Vous ne pouvez pas utiliser votre propre code.' });
        return;
      }
      referredBy = validation.referrerId!;
    }

    // Get phone from Firebase Auth user
    const firebaseUser = await authAdmin.getUser(uid);
    const phone = firebaseUser.phoneNumber || null;
    const userEmail = email && email.trim() ? email.trim() : firebaseUser.email || '';

    const user = await createUser(uid, userEmail, displayName.trim(), referredBy, phone);

    // Create referral link if referred
    if (referredBy) {
      await createReferralLink(referredBy, uid);
    }

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
