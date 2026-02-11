/**
 * Routes GeniusPay - Integration paiement multi-methodes
 *
 * Stockage en memoire localement, Firestore en production (si FIREBASE_SERVICE_ACCOUNT est set).
 * Appelle la vraie API GeniusPay si GENIUS_PAY_ENABLED=true.
 */
import { Router, Request, Response } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import {
  createPayment,
  getPaymentStatus,
  getGeniusPayConfig,
  isGeniusPayEnabled,
  verifyWebhookSignature,
  createDemoPayment,
  GeniusPayError,
} from '../services/geniusPayService';
import { MIN_RECHARGE } from '../config/constants';
import { db } from '../config/firebase';
import { updateBalance, getUser } from '../services/userService';

const router = Router();

// ─── In-memory store for payments (used locally + as fallback) ─────────────

interface PaymentRecord {
  userId: string;
  amount: number;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  checkout_url: string;
  mode: 'live' | 'demo';
  createdAt: Date;
}

const payments = new Map<string, PaymentRecord>();

// ─── Firestore helpers (only in production with credentials) ───────────────

const hasFirebaseCredentials = !!process.env.FIREBASE_SERVICE_ACCOUNT;

async function saveToFirestore(reference: string, data: any) {
  if (!hasFirebaseCredentials) return;
  try {
    const { db } = await import('../config/firebase');
    await db.collection('genius_payments').doc(reference).set(data);
  } catch {
    // Firestore unavailable - skip silently
  }
}

async function updateFirestore(reference: string, data: any) {
  if (!hasFirebaseCredentials) return;
  try {
    const { db } = await import('../config/firebase');
    await db.collection('genius_payments').doc(reference).update(data);
  } catch {
    // Firestore unavailable - skip silently
  }
}

async function rechargeUserBalance(userId: string, amount: number) {
  if (hasFirebaseCredentials) {
    const { rechargeBalance } = await import('../services/transactionService');
    return await rechargeBalance(userId, amount);
  }
  // No Firebase: return simulated result
  return { newBalance: amount, netAmount: amount, fee: 0 };
}

// ─── POST /api/genius-pay/initiate ─────────────────────────────────────────

router.post('/initiate', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: 'Montant invalide.' });
      return;
    }
    if (numAmount < MIN_RECHARGE) {
      res.status(400).json({ error: `Le montant minimum est de ${MIN_RECHARGE}F.` });
      return;
    }

    let reference: string;
    let checkout_url: string;
    let mode: 'live' | 'demo';

    if (isGeniusPayEnabled()) {
      // ── Real GeniusPay API call ──
      const apiBaseUrl = process.env.API_BASE_URL || 'https://ppc-7o2f.onrender.com';
      const config = getGeniusPayConfig();
      const payment = await createPayment(config, {
        amount: numAmount,
        currency: 'XOF',
        description: `Recharge P2C - ${numAmount}F`,
        callback_url: `${apiBaseUrl}/api/genius-pay/webhook`,
        return_url: `${apiBaseUrl}/api/genius-pay/return`,
        metadata: { userId: req.uid!, type: 'recharge' },
      });
      reference = payment.reference;
      checkout_url = payment.checkout_url;
      mode = 'live';
    } else {
      // ── Demo mode ──
      const payment = createDemoPayment(numAmount);
      reference = payment.reference;
      checkout_url = payment.checkout_url;
      mode = 'demo';
    }

    // Store in memory (always works)
    payments.set(reference, {
      userId: req.uid!,
      amount: numAmount,
      reference,
      status: 'pending',
      checkout_url,
      mode,
      createdAt: new Date(),
    });

    // Also save to Firestore if available
    saveToFirestore(reference, {
      userId: req.uid,
      amount: numAmount,
      reference,
      status: 'pending',
      mode,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      mode,
      reference,
      checkout_url,
      amount: numAmount,
    });
  } catch (error: any) {
    if (error instanceof GeniusPayError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('[GeniusPay] Initiate error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

// ─── GET /api/genius-pay/status/:reference ─────────────────────────────────

router.get('/status/:reference', verifyToken, async (req: AuthRequest, res) => {
  try {
    const reference = req.params.reference as string;
    const record = payments.get(reference);

    if (!record) {
      res.status(404).json({ error: 'Paiement introuvable.' });
      return;
    }
    if (record.userId !== req.uid) {
      res.status(403).json({ error: 'Acces refuse.' });
      return;
    }
    if (record.status === 'completed') {
      res.json({ status: 'completed', amount: record.amount });
      return;
    }

    if (isGeniusPayEnabled()) {
      // Try to check real status from GeniusPay
      try {
        const config = getGeniusPayConfig();
        const payment = await getPaymentStatus(config, reference);

        if (payment.status === 'completed') {
          record.status = 'completed';
          const result = await rechargeUserBalance(record.userId, record.amount);
          updateFirestore(reference, { status: 'completed', completedAt: new Date() });

          res.json({ status: 'completed', amount: record.amount, ...result });
          return;
        }

        res.json({
          status: payment.status || record.status,
          amount: record.amount,
          payment_method: payment.payment_method,
        });
      } catch {
        // GeniusPay API unavailable (sandbox doesn't support status queries)
        // Fall back to in-memory record
        res.json({ status: record.status, amount: record.amount, mode: record.mode });
      }
    } else {
      res.json({ status: record.status, amount: record.amount, mode: 'demo' });
    }
  } catch (error: any) {
    console.error('[GeniusPay] Status check error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

// ─── POST /api/genius-pay/demo-complete/:reference ─────────────────────────

router.post('/demo-complete/:reference', verifyToken, async (req: AuthRequest, res) => {
  try {
    const reference = req.params.reference as string;
    const record = payments.get(reference);

    if (!record) {
      res.status(404).json({ error: 'Paiement introuvable.' });
      return;
    }
    if (record.userId !== req.uid) {
      res.status(403).json({ error: 'Acces refuse.' });
      return;
    }
    if (record.status === 'completed') {
      res.status(400).json({ error: 'Paiement deja complete.' });
      return;
    }

    record.status = 'completed';
    const result = await rechargeUserBalance(record.userId, record.amount);
    updateFirestore(reference, { status: 'completed', completedAt: new Date() });

    res.json({
      success: true,
      mode: record.mode,
      reference,
      ...result,
    });
  } catch (error: any) {
    console.error('[GeniusPay] Demo complete error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur.' });
  }
});

// ─── POST /api/genius-pay/webhook ──────────────────────────────────────────

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    if (!isGeniusPayEnabled()) {
      res.json({ received: true, mode: 'demo' });
      return;
    }

    const signature = req.headers['x-genius-signature'] as string;
    const rawBody = JSON.stringify(req.body);
    const config = getGeniusPayConfig();

    if (signature && config.webhookSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, config.webhookSecret);
      if (!isValid) {
        res.status(400).json({ error: 'Invalid signature.' });
        return;
      }
    }

    const { event, data } = req.body;

    if (event === 'payment.completed' && data?.reference) {
      const record = payments.get(data.reference);
      if (record && record.status !== 'completed') {
        record.status = 'completed';
        await rechargeUserBalance(record.userId, record.amount);
        updateFirestore(data.reference, { status: 'completed', completedAt: new Date() });
        console.log(`[GeniusPay] Webhook: Payment ${data.reference} completed`);
      }
    }

    // ── Cashout (disbursement) webhooks ──
    if (event === 'cashout.completed' && data?.reference) {
      await handleCashoutCompleted(data.reference);
    }
    if (event === 'cashout.failed' && data?.reference) {
      await handleCashoutFailed(data.reference);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('[GeniusPay] Webhook error:', error);
    res.json({ received: true, error: error.message });
  }
});

// ─── Cashout Webhook Helpers ───────────────────────────────────────────────

async function handleCashoutCompleted(reference: string) {
  try {
    const snap = await db.collection('withdrawals').doc(reference).get();
    if (!snap.exists) {
      console.warn(`[GeniusPay] Cashout completed but withdrawal ${reference} not found`);
      return;
    }
    await db.collection('withdrawals').doc(reference).update({
      payoutStatus: 'completed',
      completedAt: new Date(),
    });
    console.log(`[GeniusPay] Webhook: Cashout ${reference} completed`);
  } catch (error: any) {
    console.error(`[GeniusPay] Error handling cashout.completed for ${reference}:`, error.message);
  }
}

async function handleCashoutFailed(reference: string) {
  try {
    const snap = await db.collection('withdrawals').doc(reference).get();
    if (!snap.exists) {
      console.warn(`[GeniusPay] Cashout failed but withdrawal ${reference} not found`);
      return;
    }
    const withdrawal = snap.data()!;

    // Mark as failed
    await db.collection('withdrawals').doc(reference).update({
      payoutStatus: 'failed',
      failedAt: new Date(),
    });

    // Refund the player (full amount, not net — they get the fee back too)
    const user = await getUser(withdrawal.userId);
    if (user) {
      await updateBalance(withdrawal.userId, user.balance + withdrawal.amount);
      console.log(`[GeniusPay] Webhook: Cashout ${reference} failed — refunded ${withdrawal.amount}F to ${withdrawal.userId}`);
    }
  } catch (error: any) {
    console.error(`[GeniusPay] Error handling cashout.failed for ${reference}:`, error.message);
  }
}

// ─── GET /api/genius-pay/return ────────────────────────────────────────────

router.get('/return', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>P2C - Paiement</title>
      <style>
        body { font-family: sans-serif; background: #111118; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
        .container { padding: 2rem; }
        h1 { color: #FF6B35; }
        p { color: #aaa; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Paiement traite</h1>
        <p>Vous pouvez retourner a l'application P2C.</p>
        <p>Votre solde sera mis a jour automatiquement.</p>
      </div>
    </body>
    </html>
  `);
});

// ─── GET /api/genius-pay/status-info ───────────────────────────────────────

router.get('/status-info', (_req, res) => {
  res.json({
    enabled: isGeniusPayEnabled(),
    mode: isGeniusPayEnabled() ? (process.env.GENIUS_PAY_ENV || 'sandbox') : 'demo',
  });
});

export default router;
