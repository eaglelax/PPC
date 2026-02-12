import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { API_BASE } from '../config/api';
import { Bet } from '../types';

const API_TIMEOUT = 45000;

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
    return await fetch(url, { ...options, signal: controller.signal });
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

export async function fetchBets(): Promise<Bet[]> {
  const res = await safeFetch(`${API_BASE}/bets`);
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Erreur lors du chargement des paris.');
  return data;
}

export async function createBet(amount: number): Promise<{ betId: string }> {
  const headers = await getAuthHeaders();
  const res = await safeFetch(`${API_BASE}/bets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount }),
  });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Erreur lors de la creation du pari.');
  return data;
}

export async function joinBet(betId: string): Promise<{ gameId: string }> {
  const headers = await getAuthHeaders();
  const res = await safeFetch(`${API_BASE}/bets/${betId}/join`, {
    method: 'POST',
    headers,
  });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Erreur lors de la jonction au pari.');
  return data;
}

export async function cancelBet(betId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await safeFetch(`${API_BASE}/bets/${betId}`, {
    method: 'DELETE',
    headers,
  });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || "Erreur lors de l'annulation du pari.");
}

export async function withdrawFunds(
  amount: number,
  method: string,
  phone: string
): Promise<{ amount: number; fee: number; netAmount: number; payoutStatus?: string; payoutReference?: string }> {
  const headers = await getAuthHeaders();
  const res = await safeFetch(`${API_BASE}/wallet/withdraw`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount, method, phone }),
  });
  const data = await parseJSON(res);
  if (!res.ok) throw new Error(data.error || 'Erreur lors du retrait.');
  return data;
}

export async function getWithdrawalFee(): Promise<{ percent: number }> {
  const res = await safeFetch(`${API_BASE}/settings/withdrawal_fee`);
  const data = await parseJSON(res);
  if (!res.ok) throw new Error('Erreur lors du chargement des frais.');
  return data;
}

// Real-time listener for available bets
export function onAvailableBets(
  callback: (bets: Bet[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, 'bets'),
    where('status', '==', 'waiting'),
    orderBy('amount', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const bets = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Bet[];
      callback(bets);
    },
    (error) => {
      console.error('Bets snapshot error:', error);
      if (onError) onError(error);
    }
  );
}

// Real-time listener for a specific bet (to detect match)
export function onBetUpdate(
  betId: string,
  callback: (bet: Bet | null) => void,
  onError?: (error: Error) => void
) {
  const betRef = doc(db, 'bets', betId);
  return onSnapshot(
    betRef,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as Bet);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Bet snapshot error:', error);
      if (onError) onError(error);
    }
  );
}
