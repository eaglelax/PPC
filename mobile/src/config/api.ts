import { Platform } from 'react-native';
import { auth } from './firebase';

// TODO: Replace with your actual Render URL after deployment
const PROD_API_URL = 'https://ppc-api.onrender.com/api';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const DEV_API_URL = `http://${DEV_HOST}:3001/api`;

export const API_BASE = __DEV__ ? DEV_API_URL : PROD_API_URL;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Non authentifie.');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function apiGet(endpoint: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${endpoint}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

async function apiPost(endpoint: string, body?: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// Auth
export function registerProfile(displayName: string) {
  return apiPost('/auth/register', { displayName });
}

export function getMe() {
  return apiGet('/auth/me');
}

// Transactions
export function rechargeBalance(amount: number) {
  return apiPost('/transactions/recharge', { amount });
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

export function submitChoice(gameId: string, choice?: string) {
  return apiPost(`/games/${gameId}/choice`, { choice });
}
