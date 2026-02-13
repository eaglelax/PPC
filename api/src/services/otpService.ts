import { db } from '../config/firebase';

const OTPS = 'otps';
const USERS = 'users';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 3;
const MAX_ATTEMPTS = 5;

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = '+226' + cleaned;
  }
  return cleaned;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(phone: string, isRegistration: boolean): Promise<{ code: string }> {
  const normalizedPhone = normalizePhone(phone);

  // Rate limit: max 3 OTP per phone in 10 min
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentOtps = await db.collection(OTPS)
    .where('phone', '==', normalizedPhone)
    .where('createdAt', '>=', windowStart)
    .get();

  if (recentOtps.size >= RATE_LIMIT_MAX) {
    throw new Error('Trop de demandes. Veuillez attendre 10 minutes.');
  }

  // Check phone existence in users collection
  const usersSnap = await db.collection(USERS)
    .where('phone', '==', normalizedPhone)
    .limit(1)
    .get();

  if (isRegistration && !usersSnap.empty) {
    throw new Error('Ce numero est deja utilise.');
  }

  if (!isRegistration && usersSnap.empty) {
    throw new Error('Aucun compte trouve avec ce numero.');
  }

  const code = generateCode();
  await db.collection(OTPS).add({
    phone: normalizedPhone,
    code,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    attempts: 0,
    used: false,
    createdAt: new Date(),
  });

  console.log(`[OTP] ${normalizedPhone} → ${code}`);

  return { code };
}

export async function verifyOtp(phone: string, otp: string): Promise<{ valid: boolean }> {
  const normalizedPhone = normalizePhone(phone);

  // Get the latest unused OTP for this phone
  const otpSnap = await db.collection(OTPS)
    .where('phone', '==', normalizedPhone)
    .where('used', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (otpSnap.empty) {
    throw new Error('Aucun code en attente. Demandez un nouveau code.');
  }

  const otpDoc = otpSnap.docs[0];
  const otpData = otpDoc.data();

  // Check expiration
  const expiresAt = otpData.expiresAt.toDate ? otpData.expiresAt.toDate() : new Date(otpData.expiresAt);
  if (Date.now() > expiresAt.getTime()) {
    await otpDoc.ref.update({ used: true });
    throw new Error('Code expire. Demandez un nouveau code.');
  }

  // Check attempts
  if (otpData.attempts >= MAX_ATTEMPTS) {
    await otpDoc.ref.update({ used: true });
    throw new Error('Trop de tentatives. Demandez un nouveau code.');
  }

  // Increment attempts
  await otpDoc.ref.update({ attempts: otpData.attempts + 1 });

  if (otpData.code !== otp) {
    throw new Error('Code incorrect.');
  }

  // Mark as used
  await otpDoc.ref.update({ used: true });

  return { valid: true };
}
