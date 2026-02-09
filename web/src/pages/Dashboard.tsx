import React, { useEffect, useState } from 'react';
import { getStats } from '../services/api';

interface Stats {
  users: { total: number };
  games: { total: number; resolved: number; active: number; totalBetVolume: number };
  transactions: { totalRecharges: number; totalBets: number; totalFees: number; count: number };
  waitingRoom: { count: number };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getStats();
      setStats(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) return <div className="loading">Chargement du dashboard...</div>;
  if (error && !stats) return <div className="error">Erreur : {error}</div>;
  if (!stats) return null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <button className="refresh-btn" onClick={loadStats}>Rafraichir</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Utilisateurs inscrits</div>
          <div className="value primary">{stats.users.total}</div>
        </div>
        <div className="stat-card">
          <div className="label">Parties jouees</div>
          <div className="value success">{stats.games.total}</div>
        </div>
        <div className="stat-card">
          <div className="label">Parties en cours</div>
          <div className="value warning">{stats.games.active}</div>
        </div>
        <div className="stat-card">
          <div className="label">En file d'attente</div>
          <div className="value danger">{stats.waitingRoom.count}</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Volume total des mises</div>
          <div className="value gold">{stats.games.totalBetVolume.toLocaleString()}F</div>
        </div>
        <div className="stat-card">
          <div className="label">Total recharges</div>
          <div className="value success">{stats.transactions.totalRecharges.toLocaleString()}F</div>
        </div>
        <div className="stat-card">
          <div className="label">Frais percus</div>
          <div className="value primary">{stats.transactions.totalFees.toLocaleString()}F</div>
        </div>
        <div className="stat-card">
          <div className="label">Nb transactions</div>
          <div className="value">{stats.transactions.count}</div>
        </div>
      </div>
    </div>
  );
}
