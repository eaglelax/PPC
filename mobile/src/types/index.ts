export interface UserData {
  odId: string;
  email?: string;
  displayName: string;
  phone: string;
  balance: number;
  pix: number;
  referralCode?: string;
  referredBy?: string | null;
  referralStats?: {
    referralsCount: number;
    pixEarned: number;
  };
  createdAt: Date;
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
  };
}

export interface WaitingRoom {
  odId: string;
  userId: string;
  displayName: string;
  betAmount: number;
  createdAt: Date;
  status: 'waiting' | 'matched';
}

export interface Game {
  odId: string;
  player1: PlayerState;
  player2: PlayerState;
  betAmount: number;
  status: 'choosing' | 'resolved' | 'draw' | 'cancelled';
  winner: string | null;
  round: number;
  timeoutCount: number;
  choosingStartedAt: Date;
  createdAt: Date;
  cancelledBy?: string;
}

export interface PlayerState {
  userId: string;
  displayName: string;
  choice: Choice | null;
}

export interface Bet {
  id: string;
  creatorId: string;
  creatorName: string;
  amount: number;
  status: 'waiting' | 'matched' | 'cancelled';
  gameId?: string;
  opponentId?: string;
  opponentName?: string;
  createdAt: Date;
  matchedAt?: Date;
}

export type Choice = 'pierre' | 'papier' | 'ciseaux';

export type BetAmount = number;

export interface Transaction {
  odId: string;
  userId: string;
  type: 'recharge' | 'win' | 'loss' | 'bet' | 'refund' | 'withdrawal';
  amount: number;
  fee: number;
  createdAt: Date;
}

export interface ReferralInfo {
  displayName: string;
  joinedAt: Date;
  gamesPlayed: number;
  wins: number;
  rewards: {
    firstRecharge: boolean;
    lastGameRewardAt: number;
    fiftyWins: boolean;
  };
}

export type RootStackParamList = {
  Auth: { privacyAccepted?: boolean } | undefined;
  Home: undefined;
  Bet: undefined;
  Waiting: { betId: string; betAmount: number };
  Game: { gameId: string };
  Result: { gameId: string };
  Recharge: undefined;
  Withdraw: undefined;
  Referral: undefined;
  History: undefined;
  PrivacyPolicy: { fromSignup?: boolean };
};
