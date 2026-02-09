import { db } from '../config/firebase';
import { rechargeBalance } from './transactionService';

const PAYMENTS = 'payments';

function getBaseUrl(): string {
  const env = process.env.PAYDUNYA_ENV || 'sandbox';
  return env === 'production'
    ? 'https://app.paydunya.com/api/v1'
    : 'https://app.paydunya.com/sandbox-api/v1';
}

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY || '',
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY || '',
    'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN || '',
  };
}

export async function createInvoice(
  amount: number,
  userId: string,
  paymentId: string
) {
  const baseUrl = getBaseUrl();
  const callbackUrl = `${process.env.API_BASE_URL}/api/payments/paydunya/ipn`;

  const body = {
    invoice: {
      total_amount: amount,
      description: `Recharge PPC - ${amount}F`,
    },
    store: {
      name: 'PPC Game',
    },
    custom_data: {
      userId,
      paymentId,
    },
    actions: {
      callback_url: callbackUrl,
    },
  };

  const res = await fetch(`${baseUrl}/checkout-invoice/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    response_code: string;
    response_text: string;
    token: string;
  };

  if (data.response_code !== '00') {
    throw new Error(data.response_text || 'Erreur PayDunya lors de la creation de facture.');
  }

  return {
    token: data.token,
    url: data.response_text,
  };
}

export async function checkInvoiceStatus(token: string) {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/checkout-invoice/confirm/${token}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const data = (await res.json()) as {
    status: string;
    invoice?: { total_amount: number };
  };
  return data;
}

export async function createPaymentRecord(
  userId: string,
  amount: number,
  token: string,
  url: string
) {
  const ref = await db.collection(PAYMENTS).add({
    userId,
    amount,
    token,
    checkoutUrl: url,
    status: 'pending',
    createdAt: new Date(),
  });
  return ref.id;
}

export async function completePayment(token: string) {
  // Find payment doc by token
  const snap = await db
    .collection(PAYMENTS)
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new Error('Paiement introuvable.');
  }

  const doc = snap.docs[0];
  const payment = doc.data();

  // Double-credit protection
  if (payment.status !== 'pending') {
    return { alreadyProcessed: true, status: payment.status };
  }

  // Verify with PayDunya
  const invoiceData = await checkInvoiceStatus(token);

  if (invoiceData.status !== 'completed') {
    return { alreadyProcessed: false, status: invoiceData.status };
  }

  // Verify amount matches
  const paydunyaAmount = invoiceData.invoice?.total_amount;
  if (paydunyaAmount && Number(paydunyaAmount) !== payment.amount) {
    await doc.ref.update({ status: 'amount_mismatch', updatedAt: new Date() });
    throw new Error('Le montant PayDunya ne correspond pas.');
  }

  // Mark as completed
  await doc.ref.update({ status: 'completed', updatedAt: new Date() });

  // Credit balance
  const result = await rechargeBalance(payment.userId, payment.amount);

  return { alreadyProcessed: false, status: 'completed', ...result };
}

export async function getPaymentByToken(token: string) {
  const snap = await db
    .collection(PAYMENTS)
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}
