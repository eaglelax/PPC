import { Router } from 'express';
import { AuthRequest, verifyToken } from '../middleware/auth';
import {
  createInvoice,
  createPaymentRecord,
  completePayment,
  getPaymentByToken,
} from '../services/paydunyaService';

const router = Router();

// POST /create-invoice — Create PayDunya invoice (auth required)
router.post('/create-invoice', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: 'Montant invalide.' });
      return;
    }

    // Create a placeholder payment record first to get paymentId
    const paymentId = await createPaymentRecord(req.uid!, numAmount, '', '');

    // Create PayDunya invoice
    const { token, url } = await createInvoice(numAmount, req.uid!, paymentId);

    // Update payment record with token and url
    const { db } = await import('../config/firebase');
    await db.collection('payments').doc(paymentId).update({
      token,
      checkoutUrl: url,
    });

    res.json({
      checkoutUrl: url,
      token,
      paymentId,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /ipn — PayDunya IPN callback (public, no auth)
router.post('/ipn', async (req, res) => {
  try {
    const { data } = req.body;
    const token = data?.invoice?.token;

    if (!token) {
      res.status(400).json({ error: 'Token manquant dans IPN.' });
      return;
    }

    // Verify and complete payment (includes PayDunya confirmation check)
    await completePayment(token);

    res.json({ success: true });
  } catch (error: any) {
    console.error('PayDunya IPN error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET /status/:token — Check payment status (auth required)
router.get('/status/:token', verifyToken, async (req: AuthRequest, res) => {
  try {
    const token = req.params.token as string;
    const payment = await getPaymentByToken(token);

    if (!payment) {
      res.status(404).json({ error: 'Paiement introuvable.' });
      return;
    }

    res.json({ status: (payment as any).status });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
