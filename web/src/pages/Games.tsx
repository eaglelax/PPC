import React, { useEffect, useState } from 'react';
import { getGames } from '../services/api';

interface Game {
  id: string;
  player1: { userId: string; displayName: string; choice: string | null };
  player2: { userId: string; displayName: string; choice: string | null };
  betAmount: number;
  status: string;
  winner: string | null;
  round: number;
  createdAt: any;
}

export default function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showActive, setShowActive] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setGames(await getGames(showActive));
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [showActive]);

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getWinnerName = (game: Game) => {
    if (!game.winner) return '-';
    return game.winner === game.player1.userId
      ? game.player1.displayName
      : game.player2.displayName;
  };

  if (loading) return <div className="loading">Chargement des parties...</div>;
  if (error) return <div className="error">Erreur : {error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Parties ({games.length})</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="refresh-btn"
            style={showActive ? { background: 'var(--primary)', color: '#fff' } : {}}
            onClick={() => setShowActive(!showActive)}
          >
            {showActive ? 'Toutes' : 'En cours seulement'}
          </button>
          <button className="refresh-btn" onClick={load}>Rafraichir</button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Joueur 1</th>
              <th>Joueur 2</th>
              <th>Mise</th>
              <th>Statut</th>
              <th>Round</th>
              <th>Gagnant</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id}>
                <td>
                  {g.player1.displayName}
                  {g.player1.choice && <span style={{ marginLeft: 4, opacity: 0.6 }}>({g.player1.choice})</span>}
                </td>
                <td>
                  {g.player2.displayName}
                  {g.player2.choice && <span style={{ marginLeft: 4, opacity: 0.6 }}>({g.player2.choice})</span>}
                </td>
                <td className="amount gold">{g.betAmount.toLocaleString()}F</td>
                <td><span className={`badge ${g.status}`}>{g.status}</span></td>
                <td>{g.round}</td>
                <td><strong>{getWinnerName(g)}</strong></td>
                <td>{formatDate(g.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
