import React, { useEffect, useState } from 'react';
import { getTransactions } from '../services/api';

interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  fee: number;
  createdAt: any;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setTransactions(await getTransactions());
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

  const formatAmount = (tx: Transaction) => {
    switch (tx.type) {
      case 'win':
      case 'recharge':
      case 'refund':
        return { text: `+${tx.amount.toLocaleString()}F`, cls: 'positive' };
      case 'bet':
      case 'loss':
        return { text: `-${tx.amount.toLocaleString()}F`, cls: 'negative' };
      default:
        return { text: `${tx.amount.toLocaleString()}F`, cls: '' };
    }
  };

  if (loading) return <div className="loading">Chargement des transactions...</div>;
  if (error) return <div className="error">Erreur : {error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Transactions ({transactions.length})</h1>
        <button className="refresh-btn" onClick={load}>Rafraichir</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>User ID</th>
              <th>Montant</th>
              <th>Frais</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const amt = formatAmount(tx);
              return (
                <tr key={tx.id}>
                  <td><span className={`badge ${tx.type}`}>{tx.type}</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{tx.userId.slice(0, 12)}...</td>
                  <td className={`amount ${amt.cls}`}>{amt.text}</td>
                  <td>{tx.fee > 0 ? `${tx.fee}F` : '-'}</td>
                  <td>{formatDate(tx.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
