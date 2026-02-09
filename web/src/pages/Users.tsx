import React, { useEffect, useState } from 'react';
import { getUsers } from '../services/api';

interface User {
  id: string;
  displayName: string;
  email: string;
  balance: number;
  stats: { gamesPlayed: number; wins: number; losses: number };
  createdAt: any;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await getUsers());
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="loading">Chargement des utilisateurs...</div>;
  if (error) return <div className="error">Erreur : {error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Utilisateurs ({users.length})</h1>
        <button className="refresh-btn" onClick={load}>Rafraichir</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Pseudo</th>
              <th>Email</th>
              <th>Solde</th>
              <th>Parties</th>
              <th>V / D</th>
              <th>Win Rate</th>
              <th>Inscription</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const winRate = u.stats.gamesPlayed > 0
                ? Math.round((u.stats.wins / u.stats.gamesPlayed) * 100)
                : 0;
              return (
                <tr key={u.id}>
                  <td><strong>{u.displayName}</strong></td>
                  <td>{u.email}</td>
                  <td className="amount gold">{u.balance.toLocaleString()}F</td>
                  <td>{u.stats.gamesPlayed}</td>
                  <td>
                    <span className="amount positive">{u.stats.wins}</span>
                    {' / '}
                    <span className="amount negative">{u.stats.losses}</span>
                  </td>
                  <td>{winRate}%</td>
                  <td>{formatDate(u.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
