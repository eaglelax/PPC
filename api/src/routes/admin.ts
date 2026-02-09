import { Router } from 'express';
import { getAllUsers, getUserCount } from '../services/userService';
import { getAllGames, getActiveGames, getGameStats } from '../services/gameService';
import { getAllTransactions, getTransactionStats } from '../services/transactionService';
import { getWaitingRoomStats } from '../services/matchmakingService';

const router = Router();

// GET /api/admin/stats - Dashboard global stats
router.get('/stats', async (_req, res) => {
  try {
    const [userCount, gameStats, txStats, waitingStats] = await Promise.all([
      getUserCount(),
      getGameStats(),
      getTransactionStats(),
      getWaitingRoomStats(),
    ]);

    res.json({
      users: { total: userCount },
      games: gameStats,
      transactions: txStats,
      waitingRoom: { count: waitingStats.waitingCount },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users
router.get('/users', async (_req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/games
router.get('/games', async (req, res) => {
  try {
    const active = req.query.active === 'true';
    const games = active ? await getActiveGames() : await getAllGames();
    res.json(games);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/transactions
router.get('/transactions', async (_req, res) => {
  try {
    const transactions = await getAllTransactions();
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/waiting
router.get('/waiting', async (_req, res) => {
  try {
    const stats = await getWaitingRoomStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
