/**
 * Routes Orange Money - Pret pour la production
 *
 * En mode demo (OM_ENABLED != "true"), les paiements sont simules.
 * En mode production, les vrais appels Orange Money sont effectues.
 *
 * Variables d'env requises pour la production:
 *   OM_ENABLED=true
 *   OM_USERNAME=xxx
 *   OM_PASSWORD=xxx
 *   OM_MERCHANT=xxx
 *   OM_ENV=production (ou "development" pour le serveur test)
 */
import { Router } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import {
  processPayment,
  getOrangeMoneyConfig,
  generateReference,
  OrangeMoneyError,
} from '../services/orangeMoneyService';
import { rechargeBalance } from '../services/transactionService';

const router = Router();

function isOrangeMoneyEnabled(): boolean {
  return process.env.OM_ENABLED === 'true';
}

// POST /api/orange-money/pay - Process Orange Money payment (recharge)
router.post('/pay', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { amount, phone, otp } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: 'Montant invalide.' });
      return;
    }
    if (!phone || phone.length < 8) {
      res.status(400).json({ error: 'Numero de telephone invalide.' });
      return;
    }
    if (!otp || otp.length !== 4) {
      res.status(400).json({ error: 'Code OTP invalide (4 chiffres).' });
      return;
    }

    let omTransactionId: string;

    if (isOrangeMoneyEnabled()) {
      // ── Mode Production: vrai appel Orange Money ──
      const config = getOrangeMoneyConfig();
      const externalRef = `PPC-${req.uid}-${Date.now()}`;

      const omResponse = await processPayment(config, {
        clientNumber: phone,
        amount: String(numAmount),
        otp,
        externalReference: externalRef,
      });

      omTransactionId = omResponse.transactionId;
    } else {
      // ── Mode Demo: simulation ──
      omTransactionId = `DEMO-${generateReference()}`;
    }

    // Credit le solde utilisateur
    const result = await rechargeBalance(req.uid!, numAmount);

    res.json({
      success: true,
      mode: isOrangeMoneyEnabled() ? 'production' : 'demo',
      omTransactionId,
      ...result,
    });
  } catch (error: any) {
    if (error instanceof OrangeMoneyError) {
      res.status(400).json({
        error: error.message,
        omErrorCode: error.code,
      });
      return;
    }
    res.status(400).json({ error: error.message });
  }
});

// GET /api/orange-money/status - Check mode (demo vs production)
router.get('/status', (_req, res) => {
  res.json({
    enabled: isOrangeMoneyEnabled(),
    mode: isOrangeMoneyEnabled() ? 'production' : 'demo',
    env: process.env.OM_ENV || 'development',
  });
});

export default router;
