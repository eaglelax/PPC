const API_BASE = '/api';

async function fetchApi(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(err.error || 'Erreur serveur');
  }
  return res.json();
}

export async function getStats() {
  return fetchApi('/admin/stats');
}

export async function getUsers() {
  return fetchApi('/admin/users');
}

export async function getGames(activeOnly = false) {
  return fetchApi(`/admin/games${activeOnly ? '?active=true' : ''}`);
}

export async function getTransactions() {
  return fetchApi('/admin/transactions');
}

export async function getWaiting() {
  return fetchApi('/admin/waiting');
}

export async function getHealth() {
  return fetchApi('/health');
}
