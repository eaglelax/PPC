/**
 * GeniusPay Payment Service
 *
 * Integrates with GeniusPay Merchant API (https://pay.genius.ci/docs/api)
 * Supports: Wave, Orange Money, MTN Money, Card payments
 *
 * Environment variables:
 *   GENIUS_PAY_ENABLED=true          (false = demo mode)
 *   GENIUS_PAY_API_KEY=pk_sandbox_xxx
 *   GENIUS_PAY_API_SECRET=sk_sandbox_xxx
 *   GENIUS_PAY_WEBHOOK_SECRET=whsec_xxx
 *   GENIUS_PAY_ENV=sandbox            (sandbox | production)
 */
import crypto from 'crypto';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GeniusPayConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  webhookSecret: string;
}

export interface CreatePaymentParams {
  amount: number;
  currency?: string;
  description: string;
  customer_email?: string;
  customer_name?: string;
  callback_url: string;
  return_url: string;
  metadata?: Record<string, string>;
}

export interface GeniusPayment {
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  checkout_url: string;
  payment_method?: string;
  created_at: string;
}

export interface CreateDisbursementParams {
  amount: number;
  currency?: string;
  phone: string;
  provider?: string; // wave, orange_money, mtn_money
  description: string;
  metadata?: Record<string, string>;
}

export interface GeniusDisbursement {
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  phone: string;
  created_at: string;
}

export interface GeniusWebhookPayload {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    customer_email?: string;
    metadata?: Record<string, string>;
  };
}

// ─── Constants ─────────────────────────────────────────────────────────────

const SANDBOX_BASE_URL = 'https://pay.genius.ci/api/v1/merchant';
const PROD_BASE_URL = 'https://pay.genius.ci/api/v1/merchant';

// ─── Error Class ───────────────────────────────────────────────────────────

export class GeniusPayError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'GeniusPayError';
    this.statusCode = statusCode;
  }
}

// ─── Config Helper ─────────────────────────────────────────────────────────

export function isGeniusPayEnabled(): boolean {
  return process.env.GENIUS_PAY_ENABLED === 'true';
}

export function getGeniusPayConfig(): GeniusPayConfig {
  const isProd = process.env.GENIUS_PAY_ENV === 'production';
  return {
    apiKey: process.env.GENIUS_PAY_API_KEY || '',
    apiSecret: process.env.GENIUS_PAY_API_SECRET || '',
    baseUrl: isProd ? PROD_BASE_URL : SANDBOX_BASE_URL,
    webhookSecret: process.env.GENIUS_PAY_WEBHOOK_SECRET || '',
  };
}

// ─── API Calls ─────────────────────────────────────────────────────────────

async function geniusRequest(
  config: GeniusPayConfig,
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const url = `${config.baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': config.apiKey,
    'X-API-Secret': config.apiSecret,
  };

  const options: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(url, options);
  const data: any = await res.json();

  if (!res.ok) {
    throw new GeniusPayError(
      data.message || data.error || 'Erreur GeniusPay',
      res.status
    );
  }

  return data;
}

// ─── Create Payment ────────────────────────────────────────────────────────

export async function createPayment(
  config: GeniusPayConfig,
  params: CreatePaymentParams
): Promise<GeniusPayment> {
  const body: Record<string, any> = {
    amount: params.amount,
    currency: params.currency || 'XOF',
    description: params.description,
    metadata: params.metadata,
  };

  // Real API uses success_url / error_url (not callback_url / return_url)
  if (params.callback_url) body.success_url = params.callback_url;
  if (params.return_url) body.error_url = params.return_url;

  // Customer info
  if (params.customer_email || params.customer_name) {
    body.customer = {
      ...(params.customer_name && { name: params.customer_name }),
      ...(params.customer_email && { email: params.customer_email }),
    };
  }

  const response = await geniusRequest(config, 'POST', '/payments', body);

  // GeniusPay wraps response in { success, data: { ... } }
  const d = response.data || response;
  return {
    reference: d.reference,
    amount: d.amount,
    currency: d.currency || 'XOF',
    status: d.status || 'pending',
    checkout_url: d.checkout_url || d.payment_url || '',
    payment_method: d.gateway,
    created_at: d.created_at,
  };
}

// ─── Create Disbursement (Payout) ─────────────────────────────────────────

export async function createDisbursement(
  config: GeniusPayConfig,
  params: CreateDisbursementParams
): Promise<GeniusDisbursement> {
  try {
    const response = await geniusRequest(config, 'POST', '/disbursements', {
      amount: params.amount,
      currency: params.currency || 'XOF',
      phone: params.phone,
      provider: params.provider || 'wave',
      description: params.description,
      metadata: params.metadata,
    });

    const d = response.data || response;
    return {
      reference: d.reference,
      amount: d.amount,
      currency: d.currency || 'XOF',
      status: d.status || 'processing',
      phone: params.phone,
      created_at: d.created_at || new Date().toISOString(),
    };
  } catch (error: any) {
    // If endpoint doesn't exist (404) or unsupported, let caller handle gracefully
    if (error instanceof GeniusPayError) {
      throw error;
    }
    throw new GeniusPayError(error.message || 'Erreur payout GeniusPay', 500);
  }
}

// ─── Get Payment Status ────────────────────────────────────────────────────

export async function getPaymentStatus(
  config: GeniusPayConfig,
  reference: string
): Promise<GeniusPayment> {
  const response = await geniusRequest(config, 'GET', `/payments/${reference}`);

  const d = response.data || response;
  return {
    reference: d.reference,
    amount: d.amount,
    currency: d.currency || 'XOF',
    status: d.status || 'pending',
    checkout_url: d.checkout_url || '',
    payment_method: d.gateway || d.payment_method,
    created_at: d.created_at,
  };
}

// ─── Verify Webhook Signature ──────────────────────────────────────────────

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp?: string
): boolean {
  // Real API signs: HMAC-SHA256(timestamp + "." + payload, secret)
  const message = timestamp ? `${timestamp}.${payload}` : payload;
  const computed = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Demo Mode Helpers ─────────────────────────────────────────────────────

let demoPaymentCounter = 0;

export function createDemoPayment(amount: number): GeniusPayment {
  demoPaymentCounter++;
  const ref = `DEMO-GP-${Date.now()}-${demoPaymentCounter}`;
  return {
    reference: ref,
    amount,
    currency: 'XOF',
    status: 'pending',
    checkout_url: `https://pay.genius.ci/demo/checkout/${ref}`,
    created_at: new Date().toISOString(),
  };
}

export function completeDemoPayment(reference: string, amount: number): GeniusPayment {
  return {
    reference,
    amount,
    currency: 'XOF',
    status: 'completed',
    payment_method: 'demo',
    checkout_url: '',
    created_at: new Date().toISOString(),
  };
}

export function createDemoDisbursement(amount: number, phone: string): GeniusDisbursement {
  demoPaymentCounter++;
  return {
    reference: `DEMO-DIS-${Date.now()}-${demoPaymentCounter}`,
    amount,
    currency: 'XOF',
    status: 'processing',
    phone,
    created_at: new Date().toISOString(),
  };
}
