# P2C - Stack Technique

## Vue d'ensemble

**P2C (Pierre-Papier-Ciseaux)** - Plateforme de jeu competitif avec mise d'argent reel.

| Composant | Technologie | Repertoire |
|-----------|------------|------------|
| Application mobile | React Native + Expo SDK 54 | `mobile/` |
| API Backend | Node.js + Express + Firebase Admin | `api/` |
| Dashboard Admin | React + Vite | `web/` |
| Base de donnees | Cloud Firestore | Firebase `ppc-game-8b35f` |
| Authentification | Firebase Auth | Client + Admin SDK |
| Hebergement API | Render | `ppc-rnft.onrender.com` |
| Build mobile | EAS Build | Compte `lexova` |

---

## 1. Application Mobile (`mobile/`)

### Stack

| Dependance | Version | Role |
|-----------|---------|------|
| React Native | 0.81.5 | Framework UI natif |
| Expo | 54.0.33 | Toolchain + services natifs |
| React | 19.1.0 | Librairie UI |
| Firebase (client) | 11.10.0 | Auth + Firestore realtime |
| React Navigation | 7.x | Navigation native-stack |
| AsyncStorage | 2.2.0 | Persistance auth Firebase |
| react-native-svg | 15.12.1 | Timer circulaire SVG |
| expo-haptics | 15.x | Retour haptique |
| expo-linear-gradient | 15.x | Gradients UI |
| expo-font | 14.x | Polices Outfit/Sora |
| TypeScript | 5.9.2 | Typage statique |

### Architecture

```
mobile/src/
├── screens/          # 8 ecrans
│   ├── AuthScreen.tsx        # Login / Inscription (Firebase Auth)
│   ├── HomeScreen.tsx        # Accueil (solde, stats, navigation)
│   ├── BetScreen.tsx         # Creer / Rejoindre un pari
│   ├── WaitingScreen.tsx     # Attente d'un adversaire
│   ├── GameScreen.tsx        # Partie en cours (choix + timer 30s)
│   ├── ResultScreen.tsx      # Resultat (victoire/defaite + confetti)
│   ├── RechargeScreen.tsx    # Recharger le solde
│   └── WithdrawScreen.tsx    # Retrait de fonds
├── services/         # 6 services (appels Firestore + API)
│   ├── authService.ts        # Signup, login, logout, reset password
│   ├── userService.ts        # Profil utilisateur
│   ├── gameService.ts        # Ecoute realtime des parties
│   ├── matchmakingService.ts # File d'attente
│   ├── betService.ts         # Paris (ecoute realtime)
│   └── transactionService.ts # Historique transactions
├── config/           # Configuration
│   ├── firebase.ts           # Init Firebase client + Auth persistence
│   ├── api.ts                # Client HTTP (fetch + Bearer token)
│   ├── theme.ts              # Design system (couleurs, typo, spacing)
│   └── countries.ts          # Pays Orange Money supportes
├── contexts/
│   └── AuthContext.tsx        # Context global (user, userData, auth state)
├── components/
│   ├── CircularTimer.tsx     # Timer SVG circulaire
│   ├── ErrorBoundary.tsx     # Catch erreurs React
│   ├── GradientButton.tsx    # Bouton avec gradient
│   ├── LoadingScreen.tsx     # Ecran de chargement anime
│   └── Navbar.tsx            # Barre de navigation
├── utils/
│   └── alert.ts              # Alert cross-platform (native + web)
└── types/
    └── index.ts              # Types partages (Game, Choice, User, etc.)
```

### Configuration Expo

- **Bundle ID** : `com.ppcgame.app` (Android + iOS)
- **Architecture** : New Architecture active (`newArchEnabled: true`)
- **Theme** : Dark mode uniquement (`userInterfaceStyle: "dark"`)
- **Orientation** : Portrait only
- **EAS Project** : `a9c47ee1-03c5-4926-87da-049f5050f8b8`

### Flux de donnees

```
Firebase Auth (client) ──> ID Token ──> API (verification)
                                          │
Firestore (realtime) <───────────────── Mutations
     │
     └── onSnapshot listeners (games, bets, users)
```

- **Auth** : Firebase Auth client-side, token envoye dans `Authorization: Bearer <token>`
- **Lectures** : Firestore real-time listeners (`onSnapshot`) pour mises a jour instantanees
- **Ecritures** : Toutes les mutations passent par l'API (bet, choice, recharge, retrait)

---

## 2. API Backend (`api/`)

### Stack

| Dependance | Version | Role |
|-----------|---------|------|
| Node.js | >=18 | Runtime |
| Express | 4.21.0 | Framework HTTP |
| firebase-admin | 13.0.0 | Auth verification + Firestore admin |
| cors | 2.8.5 | CORS middleware |
| dotenv | 17.2.4 | Variables d'environnement |
| TypeScript | 5.6.0 | Typage statique |
| tsx | 4.19.0 | Dev mode (watch + hot reload) |

### Architecture

```
api/src/
├── index.ts              # Point d'entree (port 3001)
├── config/
│   ├── firebase.ts       # Init Firebase Admin (base64 ou JSON)
│   └── constants.ts      # Constantes metier
├── middleware/
│   └── auth.ts           # Verification Bearer token
├── routes/               # 11 fichiers de routes
│   ├── auth.ts           # POST /register, GET /me
│   ├── bets.ts           # CRUD paris
│   ├── games.ts          # Choix, timeout, annulation
│   ├── matchmaking.ts    # File d'attente
│   ├── transactions.ts   # Recharge, historique
│   ├── wallet.ts         # Retrait
│   ├── orangeMoney.ts    # Paiement Orange Money
│   ├── geniusPay.ts      # Paiement GeniusPay + webhooks
│   ├── settings.ts       # Config admin (frais)
│   └── admin.ts          # Stats, listes (dashboard)
└── services/             # 8 services metier
    ├── userService.ts
    ├── gameService.ts        # Transactions Firestore pour resolution
    ├── betService.ts
    ├── matchmakingService.ts
    ├── transactionService.ts
    ├── walletService.ts
    ├── feeService.ts
    ├── gameCleanup.ts        # Job toutes les 30s
    ├── orangeMoneyService.ts
    └── geniusPayService.ts
```

### Endpoints API

#### Auth (`/api/auth`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/register` | Oui | Creer profil utilisateur |
| GET | `/me` | Oui | Recuperer profil courant |

#### Paris (`/api/bets`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/` | Non | Lister les paris disponibles |
| POST | `/` | Oui | Creer un pari |
| POST | `/:id/join` | Oui | Rejoindre un pari |
| DELETE | `/:id` | Oui | Annuler son pari |

#### Parties (`/api/games`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/:id` | Oui | Details d'une partie |
| POST | `/:id/choice` | Oui | Soumettre un choix |
| POST | `/:id/timeout` | Oui | Signaler un timeout |
| POST | `/:id/cancel-stale` | Oui | Annuler partie bloquee |
| POST | `/cancel-active` | Oui | Annuler toutes les parties actives |

#### Matchmaking (`/api/matchmaking`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/join` | Oui | Rejoindre la file d'attente |
| POST | `/leave` | Oui | Quitter la file |

#### Transactions (`/api/transactions`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/recharge` | Oui | Recharger le solde |
| GET | `/history` | Oui | Historique des transactions |

#### Portefeuille (`/api/wallet`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/withdraw` | Oui | Retrait de fonds |

#### Paiements Orange Money (`/api/orange-money`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/pay` | Oui | Paiement OTP |
| GET | `/status` | Non | Mode actuel (demo/production) |

#### Paiements GeniusPay (`/api/genius-pay`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/initiate` | Oui | Initier un paiement |
| GET | `/status/:reference` | Oui | Statut d'un paiement |
| POST | `/demo-complete/:reference` | Oui | Completer en mode demo |
| POST | `/webhook` | Non | Webhook GeniusPay |
| GET | `/return` | Non | Page retour paiement |
| GET | `/status-info` | Non | Mode actuel |

#### Admin (`/api/admin`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/stats` | Non | Statistiques globales |
| GET | `/users` | Non | Liste des utilisateurs |
| GET | `/games` | Non | Liste des parties |
| GET | `/transactions` | Non | Liste des transactions |
| GET | `/waiting` | Non | File d'attente |

#### Settings (`/api/settings`)
| Methode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/withdrawal_fee` | Non | Lire le % de frais retrait |
| PUT | `/withdrawal_fee` | Non | Modifier le % |

### Constantes metier

```
INITIAL_BALANCE = 5000F    # Solde initial a l'inscription
CHOICE_TIMER    = 30s      # Temps pour choisir
MIN_BET_AMOUNT  = 1000F    # Mise minimum
BET_AMOUNTS     = [1000, 2000, 3000, 4000, 5000]
GAME_FEE        = 10F      # Frais par partie
MIN_WITHDRAWAL  = 1000F    # Retrait minimum
MIN_RECHARGE    = 1010F    # Recharge minimum
```

---

## 3. Dashboard Admin (`web/`)

### Stack

| Dependance | Version | Role |
|-----------|---------|------|
| React | 19.0.0 | UI |
| Vite | 6.0.0 | Bundler |
| react-router-dom | 7.1.0 | Routing |
| TypeScript | 5.6.0 | Typage |

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Stats globales (users, games, revenus) |
| Users | `/users` | Liste des joueurs + soldes |
| Games | `/games` | Historique des parties |
| Transactions | `/transactions` | Historique des transactions |

### Deploiement

Le dashboard est build en statique (`vite build` → `web/dist/`) et servi par l'API Express a la racine `/`.

---

## 4. Base de donnees Firestore

### Collections

| Collection | Documents | Cle primaire |
|-----------|-----------|-------------|
| `users` | Profils joueurs | UID Firebase Auth |
| `games` | Parties | Auto-ID |
| `bets` | Paris | Auto-ID |
| `waiting_room` | File matchmaking | Auto-ID |
| `transactions` | Historique financier | Auto-ID |
| `withdrawals` | Retraits | Reference paiement |
| `fees` | Frais collectes | Auto-ID |
| `genius_payments` | Paiements GeniusPay | Reference |
| `settings` | Configuration globale | Nom du parametre |

### Schema principal

**users**
```
{
  odId: string,
  email: string,
  displayName: string,
  balance: number,
  pix: number,
  createdAt: Timestamp,
  stats: { gamesPlayed: number, wins: number, losses: number }
}
```

**games**
```
{
  player1: { userId, displayName, choice },
  player2: { userId, displayName, choice },
  betAmount: number,
  status: 'choosing' | 'resolved' | 'draw' | 'cancelled',
  winner: string | null,
  round: number,
  choosingStartedAt: Timestamp,
  createdAt: Timestamp
}
```

**bets**
```
{
  creatorId: string,
  creatorName: string,
  amount: number,
  gameFee: number,
  status: 'waiting' | 'matched' | 'cancelled',
  gameId?: string,
  createdAt: Timestamp
}
```

**transactions**
```
{
  userId: string,
  type: 'recharge' | 'win' | 'loss' | 'bet' | 'refund' | 'withdrawal',
  amount: number,
  fee: number,
  createdAt: Timestamp
}
```

---

## 5. Deploiement

### Build & Deploy

```bash
# Root package.json orchestrates everything:
npm install          # → postinstall → build all
npm start            # → cd api && node dist/index.js
```

**Pipeline de build :**
1. `npm install` (root) → installe deps API + Web
2. `npm run build:web` → Vite build → `web/dist/`
3. `npm run build:api` → TypeScript → `api/dist/`
4. `npm start` → Express sert API + dashboard statique

### Render (API + Web)

- **URL** : `https://ppc-rnft.onrender.com`
- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Port** : 3001
- **Free tier** : spin down apres 15min d'inactivite

### Variables d'environnement (Render)

```
FIREBASE_SERVICE_ACCOUNT  # Base64-encoded service account JSON
PORT                      # 3001
OM_ENABLED                # true/false (Orange Money)
GENIUS_PAY_ENABLED        # true/false
GENIUS_PAY_API_KEY        # Cle API
GENIUS_PAY_SECRET         # Secret
API_BASE_URL              # URL publique de l'API
```

### EAS Build (Mobile)

- **Compte** : `lexova`
- **Profil** : `preview` (APK, credentials locales)
- **Keystore** : `mobile/ppcgame.jks` (local)

```bash
cd mobile
npx eas build --platform android --profile preview
```

---

## 6. Flux de jeu

```
1. Joueur cree un pari (POST /bets)
   └── Deduction: montant + 10F frais

2. Adversaire rejoint (POST /bets/:id/join)
   └── Deduction: montant + 10F frais
   └── Creation game (status: 'choosing')

3. Les deux joueurs choisissent (POST /games/:id/choice)
   └── Timer: 30 secondes
   └── Timeout = defaite automatique

4. Resolution (Firestore transaction)
   └── Pierre > Ciseaux > Papier > Pierre
   └── Egalite → nouveau round (status: 'draw')
   └── Victoire → gagnant recoit 2x la mise + 1 Pix

5. Nettoyage auto (gameCleanup, toutes les 30s)
   └── Parties bloquees > 2min → annulation + remboursement
```

---

## 7. Paiements

| Methode | Statut | Usage |
|---------|--------|-------|
| Orange Money | Mode demo | Recharge via OTP SMS |
| GeniusPay | Mode demo | Recharge web + retraits |
| Solde initial | Actif | 5000F a l'inscription |

### Frais

| Type | Montant |
|------|---------|
| Frais de partie | 10F fixe |
| Frais de retrait | 2% (configurable) |
| Frais de recharge | 0F |
