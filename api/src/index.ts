import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import matchmakingRoutes from './routes/matchmaking';
import gameRoutes from './routes/games';
import adminRoutes from './routes/admin';
import betRoutes from './routes/bets';
import walletRoutes from './routes/wallet';
import settingsRoutes from './routes/settings';
import orangeMoneyRoutes from './routes/orangeMoney';
import paydunyaRoutes from './routes/paydunya';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/orange-money', orangeMoneyRoutes);
app.use('/api/payments/paydunya', paydunyaRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`PPC API running on port ${PORT}`);
});
