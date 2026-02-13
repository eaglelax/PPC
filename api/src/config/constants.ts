export const INITIAL_BALANCE = 0;
export const RECHARGE_FEE = 0;
export const CHOICE_TIMER = 30;
export const MIN_BET_AMOUNT = 1000;
export const BET_AMOUNTS = [1000, 2000, 3000, 4000, 5000] as const;
export const GAME_FEE = 10;
export const MIN_WITHDRAWAL = 1000;
export const MIN_RECHARGE = 1010;

export type BetAmount = (typeof BET_AMOUNTS)[number];
export type Choice = 'pierre' | 'papier' | 'ciseaux';
export type GameStatus = 'choosing' | 'resolved' | 'draw' | 'cancelled';
export type BetStatus = 'waiting' | 'matched' | 'cancelled';
export type TransactionType = 'recharge' | 'win' | 'loss' | 'bet' | 'refund' | 'withdrawal';
