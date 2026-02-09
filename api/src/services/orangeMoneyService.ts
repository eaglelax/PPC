/**
 * Orange Money Burkina SDK - Node.js Port
 *
 * Ported from faso-dev/orange-money-burkina-sdk (PHP)
 * Handles XML-based API communication with Orange Money Burkina payment gateway.
 */
import https from 'https';
import http from 'http';
import crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrangeMoneyCredentials {
  username: string;
  password: string;
  merchantNumber: string;
}

export interface OrangeMoneyTransactionData {
  clientNumber: string;
  amount: string;
  otp: string;
  externalReference: string;
  referenceNumber?: string;
}

export interface OrangeMoneyResponse {
  status: number;
  message: string;
  transactionId: string;
}

export interface OrangeMoneyConfig {
  credentials: OrangeMoneyCredentials;
  apiUrl?: string;
  sslVerification?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEV_API_URL = 'https://testom.orange.bf:9008/payment';
export const PROD_API_URL = 'https://apiom.orange.bf';

// ─── Reference Generator ────────────────────────────────────────────────────

export function generateReference(): string {
  let str = '';
  while (str.length < 20) {
    const size = 20 - str.length;
    const bytes = crypto.randomBytes(size);
    str += bytes
      .toString('base64')
      .replace(/[/+=]/g, '')
      .substring(0, size);
  }
  return str.toUpperCase();
}

// ─── XML Request Body Builder ───────────────────────────────────────────────

function buildRequestBody(
  credentials: OrangeMoneyCredentials,
  data: OrangeMoneyTransactionData
): string {
  const ref = data.referenceNumber || generateReference();
  return `<?xml version='1.0' encoding='UTF-8'?>
<COMMAND>
    <TYPE>OMPREQ</TYPE>
    <customer_msisdn>${escapeXml(data.clientNumber)}</customer_msisdn>
    <merchant_msisdn>${escapeXml(credentials.merchantNumber)}</merchant_msisdn>
    <api_username>${escapeXml(credentials.username)}</api_username>
    <api_password>${escapeXml(credentials.password)}</api_password>
    <amount>${escapeXml(data.amount)}</amount>
    <PROVIDER>101</PROVIDER>
    <PROVIDER2>101</PROVIDER2>
    <PAYID>12</PAYID>
    <PAYID2>12</PAYID2>
    <otp>${escapeXml(data.otp)}</otp>
    <reference_number>${escapeXml(ref)}</reference_number>
    <ext_txn_id>${escapeXml(data.externalReference)}</ext_txn_id>
</COMMAND>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── XML Response Parser ────────────────────────────────────────────────────

function parseXmlTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function parseXMLResponse(rawResponse: string): {
  status: number;
  message: string;
  transID: string;
} {
  // Wrap in <response> like the PHP SDK does
  const wrapped = `<response>${rawResponse}</response>`;
  return {
    status: parseInt(parseXmlTag(wrapped, 'status'), 10) || 0,
    message: parseXmlTag(wrapped, 'message'),
    transID: parseXmlTag(wrapped, 'transID'),
  };
}

// ─── HTTP Request (replaces PHP cURL) ───────────────────────────────────────

function sendXmlRequest(
  url: string,
  body: string,
  sslVerification: boolean = true
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';

    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(body, 'utf-8'),
      },
      rejectUnauthorized: sslVerification,
    };

    const transport = isHttps ? https : http;
    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

// ─── Error Class ────────────────────────────────────────────────────────────

export class OrangeMoneyError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'OrangeMoneyError';
    this.code = code;
  }
}

// ─── Main SDK: Process Payment ──────────────────────────────────────────────

export async function processPayment(
  config: OrangeMoneyConfig,
  transactionData: OrangeMoneyTransactionData
): Promise<OrangeMoneyResponse> {
  const url = config.apiUrl || DEV_API_URL;
  const ssl = config.sslVerification !== false;
  const body = buildRequestBody(config.credentials, transactionData);

  let rawResponse: string;
  try {
    rawResponse = await sendXmlRequest(url, body, ssl);
  } catch (err: any) {
    throw new OrangeMoneyError(
      `Erreur de connexion Orange Money: ${err.message}`,
      0
    );
  }

  const parsed = parseXMLResponse(rawResponse);

  if (parsed.status !== 200) {
    throw new OrangeMoneyError(
      parsed.message || 'Transaction Orange Money echouee.',
      parsed.status
    );
  }

  return {
    status: parsed.status,
    message: parsed.message,
    transactionId: parsed.transID,
  };
}

// ─── Helper: Load credentials from env ──────────────────────────────────────

export function getOrangeMoneyConfig(): OrangeMoneyConfig {
  const username = process.env.OM_USERNAME || '';
  const password = process.env.OM_PASSWORD || '';
  const merchantNumber = process.env.OM_MERCHANT || '';
  const isProd = process.env.OM_ENV === 'production';

  return {
    credentials: { username, password, merchantNumber },
    apiUrl: isProd ? PROD_API_URL : DEV_API_URL,
    sslVerification: isProd, // Disable SSL in dev (test server cert)
  };
}
