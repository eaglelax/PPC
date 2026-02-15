import { Platform } from 'react-native';
import { auth } from './firebase';

const PROD_API_URL = 'https://ppc-rnft.onrender.com/api';

const DEV_HOST = Platform.OS === 'android' ? '192.168.11.228' : 'localhost';
const DEV_API_URL = `http://${DEV_HOST}:3001/api`;

export const API_BASE = PROD_API_URL;

const API_TIMEOUT = 45000; // 45s (Render cold start can take 30s+)

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Non authentifie.');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Le serveur met du temps a repondre. Veuillez reessayer.');
    }
    throw new Error('Erreur reseau. Verifiez votre connexion internet.');
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJSON(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Le serveur est en cours de demarrage. Veuillez reessayer dans quelques secondes.');
  }
}

async function apiGet(endpoint: string) {
  const headers = await getAuthHeaders();
  const res = await safeFetch(`${API_BASE}${endpoint}`, { headers });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

async function apiPost(endpoint: string, body?: any) {
  const headers = await getAuthHeaders();
  const res = await safeFetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// Auth - public (no Bearer token)
async function apiPostPublic(endpoint: string, body?: Record<string, unknown>) {
  const res = await safeFetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export function sendOtp(phone: string, isRegistration: boolean) {
  return apiPostPublic('/auth/send-otp', { phone, isRegistration });
}

export function verifyOtp(phone: string, otp: string) {
  return apiPostPublic('/auth/verify-otp', { phone, otp });
}

export function registerProfile(displayName: string, email?: string, referralCode?: string) {
  return apiPost('/auth/register', { displayName, email, referralCode });
}

export function getMe() {
  return apiGet('/auth/me');
}

// Transactions
export function rechargeBalance(amount: number) {
  return apiPost('/transactions/recharge', { amount });
}

export function getTransactionHistory() {
  return apiGet('/transactions/history');
}

// Matchmaking
export function joinMatchmaking(betAmount: number) {
  return apiPost('/matchmaking/join', { betAmount });
}

export function leaveMatchmaking() {
  return apiPost('/matchmaking/leave');
}

// Games
export function getGameById(gameId: string) {
  return apiGet(`/games/${gameId}`);
}

export function submitChoice(gameId: string, choice: string) {
  return apiPost(`/games/${gameId}/choice`, { choice });
}

export function submitTimeout(gameId: string) {
  return apiPost(`/games/${gameId}/timeout`);
}

export function cancelStaleGame(gameId: string) {
  return apiPost(`/games/${gameId}/cancel-stale`);
}

export function cancelActiveGames() {
  return apiPost('/games/cancel-active');
}

export function cancelGame(gameId: string) {
  return apiPost(`/games/${gameId}/cancel`);
}

// Orange Money
export function payWithOrangeMoney(amount: number, phone: string, otp: string) {
  return apiPost('/orange-money/pay', { amount, phone, otp });
}

// GeniusPay
export function initiateGeniusPayment(amount: number) {
  return apiPost('/genius-pay/initiate', { amount });
}

export function getGeniusPaymentStatus(reference: string) {
  return apiGet(`/genius-pay/status/${reference}`);
}

export function completeGeniusDemoPayment(reference: string) {
  return apiPost(`/genius-pay/demo-complete/${reference}`);
}

export function getGeniusPayInfo() {
  return apiGet('/genius-pay/status-info');
}

// Referral (validate does not require auth - used before registration)
export async function validateReferralCode(code: string) {
  const res = await safeFetch(`${API_BASE}/referral/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export function getMyReferralCode() {
  return apiGet('/referral/my-code');
}

export function getReferralStats() {
  return apiGet('/referral/stats');
}
