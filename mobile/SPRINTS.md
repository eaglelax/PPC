# PPC Game - Pierre Papier Ciseaux avec Paris

## Infrastructure

| Service | Usage | Détails |
|---------|-------|---------|
| **Railway** | Base de données MySQL | Host: `switchyard.proxy.rlwy.net:48340`, DB: `kibboutz` |
| **Render** | API Express.js | URL: `https://kibboutz-v2.onrender.com` (auto-deploy sur git push) |
| **EAS Build** | Génération APK | Compte: `axelnig`, build profile: `preview` |

---

## Flux Utilisateur

```
Connexion → Accueil (Recharger / Jouer)
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
 RECHARGER               JOUER
    ↓                       ↓
 Choisir méthode         Voir liste des paris
 (Orange, MTN, etc.)     (classés 1000F → max)
    ↓                       ↓
 Entrer numéro           Rejoindre un pari OU
    ↓                   Créer son propre pari
 Générer OTP                ↓
    ↓                   Attente adversaire
 Confirmation               ↓
                        GameScreen (Pierre/Papier/Ciseaux)
                            ↓
                        Résultat + Gains
```

---

## Règles Financières

| Action | Frais |
|--------|-------|
| **Recharge** | 0F (aucun frais) |
| **Retrait** | X% (configurable par admin) |
| **Mise minimum** | 1000F |

---

## SPRINT 1 : Setup & Infrastructure (3 jours)

### Objectifs
- Initialiser le projet Expo (si pas fait)
- Configurer la connexion MySQL (Railway)
- Déployer l'API de base sur Render

### Tâches

#### 1.1 API Express.js (Render)
- [ ] Initialiser le projet Node.js + Express + TypeScript
- [ ] Configurer la connexion MySQL (mysql2)
- [ ] Créer les routes de base : `/health`, `/api/v1/...`
- [ ] Configurer CORS pour le mobile
- [ ] Déployer sur Render (auto-deploy git)

#### 1.2 Base de données MySQL (Railway)
```sql
-- Utilisateurs
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  display_name VARCHAR(100),
  balance DECIMAL(10,2) DEFAULT 5000.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('recharge', 'withdrawal', 'bet', 'win') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Paris disponibles
CREATE TABLE bets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creator_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('waiting', 'matched', 'playing', 'finished', 'cancelled') DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

-- Parties
CREATE TABLE games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bet_id INT NOT NULL,
  player1_id INT NOT NULL,
  player2_id INT NOT NULL,
  player1_choice ENUM('pierre', 'papier', 'ciseaux'),
  player2_choice ENUM('pierre', 'papier', 'ciseaux'),
  winner_id INT,
  round INT DEFAULT 1,
  status ENUM('playing', 'finished') DEFAULT 'playing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bet_id) REFERENCES bets(id)
);

-- Configuration admin
CREATE TABLE settings (
  key_name VARCHAR(50) PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO settings (key_name, value) VALUES ('withdrawal_fee_percent', '5');
```

---

## SPRINT 2 : Authentification (2 jours)

### Objectifs
- Inscription / Connexion avec JWT
- Mettre à jour le mobile pour utiliser l'API

### Tâches

#### 2.1 API - Auth
- [ ] Route `POST /api/auth/register` (email, password, phone, display_name)
- [ ] Route `POST /api/auth/login` (email, password) → retourne JWT
- [ ] Middleware `authMiddleware` pour vérifier le JWT
- [ ] Route `GET /api/auth/me` → retourne les infos utilisateur + solde

#### 2.2 Mobile - AuthScreen
- [ ] Modifier pour appeler l'API au lieu de Firebase
- [ ] Stocker le JWT dans AsyncStorage
- [ ] Mettre à jour AuthContext

---

## SPRINT 3 : Accueil & Portefeuille (2 jours)

### Objectifs
- HomeScreen avec solde (depuis API)
- Boutons Recharger / Jouer / Retirer

### Tâches

#### 3.1 API - Wallet
- [ ] Route `GET /api/wallet/balance` → retourne le solde
- [ ] Route `GET /api/wallet/transactions` → historique

#### 3.2 Mobile - HomeScreen
- [ ] Afficher le solde depuis l'API
- [ ] Bouton "Recharger" → RechargeScreen
- [ ] Bouton "Jouer" → BetListScreen
- [ ] Bouton "Retirer" → WithdrawScreen

---

## SPRINT 4 : Recharge Mobile Money (3 jours)

### Objectifs
- Choisir méthode de paiement (Orange Money, MTN, etc.)
- Générer OTP
- Confirmer la recharge (0 frais)

### Tâches

#### 4.1 API - Recharge
- [ ] Route `POST /api/wallet/recharge/init` (amount, method, phone)
  - Crée une transaction pending
  - Retourne un ID de transaction
- [ ] Route `POST /api/wallet/recharge/confirm` (transaction_id, otp)
  - Vérifie l'OTP (simulation pour l'instant)
  - Met à jour le solde (0 frais)
  - Marque la transaction comme completed

#### 4.2 Mobile - RechargeScreen
- [ ] Liste des méthodes : Orange Money, MTN Money, Moov Money
- [ ] Champ montant
- [ ] Champ numéro de téléphone
- [ ] Bouton "Générer OTP"
- [ ] Champ OTP + Bouton "Confirmer"
- [ ] Message de succès + retour à l'accueil

---

## SPRINT 5 : Liste des Paris & Création (3 jours)

### Objectifs
- Voir la liste des paris disponibles (classés par montant croissant)
- Rejoindre un pari existant
- Créer son propre pari (minimum 1000F)

### Tâches

#### 5.1 API - Bets
- [ ] Route `GET /api/bets` → liste des paris en attente (ORDER BY amount ASC)
- [ ] Route `POST /api/bets` → créer un pari (amount >= 1000)
  - Vérifie le solde
  - Déduit le montant du solde
  - Crée le pari avec status "waiting"
- [ ] Route `POST /api/bets/:id/join` → rejoindre un pari
  - Vérifie le solde
  - Déduit le montant
  - Change status à "matched"
  - Crée la game
- [ ] Route `DELETE /api/bets/:id` → annuler son pari (rembourse)

#### 5.2 Mobile - BetListScreen (nouveau)
- [ ] Liste des paris disponibles (FlatList)
  - Afficher : montant, pseudo du créateur, temps d'attente
  - Classement du plus petit (1000F) au plus grand
- [ ] Bouton "Rejoindre" sur chaque pari
- [ ] Bouton flottant "+" pour créer un pari
- [ ] Modal pour créer un pari (champ montant, minimum 1000F)
- [ ] Vérification du solde avant création/join

---

## SPRINT 6 : Matchmaking Temps Réel (2 jours)

### Objectifs
- WebSocket pour notifier en temps réel
- Attente d'un adversaire
- Notification quand quelqu'un rejoint

### Tâches

#### 6.1 API - WebSocket (Socket.io)
- [ ] Installer socket.io
- [ ] Event `bet:created` → notifier tous les clients (nouvelle liste)
- [ ] Event `bet:joined` → notifier le créateur
- [ ] Event `game:start` → notifier les deux joueurs
- [ ] Room par game_id pour les parties

#### 6.2 Mobile - WaitingScreen
- [ ] Connexion WebSocket à l'API
- [ ] Animation d'attente
- [ ] Écouter `bet:joined` → rediriger vers GameScreen
- [ ] Bouton "Annuler" → rembourse et supprime le pari

---

## SPRINT 7 : Jeu Pierre-Papier-Ciseaux (3 jours)

### Objectifs
- Écran de jeu avec les 3 choix
- Timer 30 secondes
- Logique de victoire via API

### Tâches

#### 7.1 API - Game
- [ ] Route `POST /api/games/:id/choice` (choice: pierre|papier|ciseaux)
  - Enregistre le choix du joueur
  - Si les 2 ont joué → détermine le gagnant
  - Retourne le résultat via WebSocket
- [ ] WebSocket events :
  - `game:choice_made` → l'adversaire a fait son choix (sans révéler)
  - `game:result` → résultat de la manche
  - `game:replay` → égalité, on rejoue

#### 7.2 Mobile - GameScreen
- [ ] 3 boutons : Pierre, Papier, Ciseaux (avec icônes)
- [ ] Timer 30 secondes (choix aléatoire si timeout)
- [ ] Afficher "En attente du choix adverse..." après avoir choisi
- [ ] Écouter le résultat via WebSocket

#### 7.3 Logique du jeu (API)
```
Pierre > Ciseaux
Ciseaux > Papier
Papier > Pierre
Égalité → Rejouer automatiquement (round + 1)
```

---

## SPRINT 8 : Résultat & Gains (2 jours)

### Objectifs
- Afficher le résultat
- Mettre à jour les soldes
- Gérer l'égalité (rejouer)

### Tâches

#### 8.1 API - Result
- [ ] Calculer les gains :
  - Gagnant : +mise × 2 (récupère sa mise + celle de l'adversaire)
  - Perdant : 0 (déjà débité)
- [ ] Mettre à jour les soldes dans la DB
- [ ] Créer les transactions (win/loss)

#### 8.2 Mobile - ResultScreen
- [ ] Afficher les deux choix (animation révélation)
- [ ] Afficher "Victoire !" ou "Défaite..." ou "Égalité !"
- [ ] Si égalité → auto-redirect vers GameScreen (même partie, round +1)
- [ ] Afficher le gain/perte
- [ ] Bouton "Retour à l'accueil"

---

## SPRINT 9 : Retrait avec Frais (2 jours)

### Objectifs
- Demander un retrait
- Appliquer le pourcentage de frais (configurable par admin)

### Tâches

#### 9.1 API - Withdrawal
- [ ] Route `GET /api/settings/withdrawal_fee` → retourne le pourcentage actuel
- [ ] Route `POST /api/wallet/withdraw` (amount, method, phone)
  - Vérifie le solde
  - Calcule les frais : `amount * (fee_percent / 100)`
  - Montant net : `amount - frais`
  - Déduit le montant total du solde
  - Crée la transaction pending

#### 9.2 Mobile - WithdrawScreen (nouveau)
- [ ] Afficher le solde disponible
- [ ] Champ montant
- [ ] Afficher les frais en temps réel : "Frais: X% = YF"
- [ ] Afficher le montant net : "Vous recevrez: ZF"
- [ ] Sélection méthode (Orange, MTN, Moov) + numéro
- [ ] Bouton "Retirer"
- [ ] Confirmation

---

## SPRINT 10 : Admin & Finitions (3 jours)

### Objectifs
- Routes admin pour modifier les paramètres
- Tests complets
- Build APK final

### Tâches

#### 10.1 API - Admin
- [ ] Route `PUT /api/admin/settings/withdrawal_fee` (percent)
- [ ] Route `GET /api/admin/stats` (users count, games count, total volume)
- [ ] Route `GET /api/admin/transactions` (liste de toutes les transactions)
- [ ] Authentification admin (JWT avec rôle admin)

#### 10.2 Tests & Déploiement
- [ ] Tester le flux complet avec 2 appareils/émulateurs
- [ ] Tester recharge (simulation OTP)
- [ ] Tester parties et gains
- [ ] Tester retrait avec frais
- [ ] Build APK : `eas build --profile preview --platform android`
- [ ] Distribuer l'APK pour tests

---

## Récapitulatif des Sprints

| Sprint | Durée | Description |
|--------|-------|-------------|
| 1 | 3 jours | Setup & Infrastructure (MySQL, API) |
| 2 | 2 jours | Authentification (JWT) |
| 3 | 2 jours | Accueil & Portefeuille |
| 4 | 3 jours | Recharge Mobile Money |
| 5 | 3 jours | Liste des Paris & Création |
| 6 | 2 jours | Matchmaking Temps Réel |
| 7 | 3 jours | Jeu Pierre-Papier-Ciseaux |
| 8 | 2 jours | Résultat & Gains |
| 9 | 2 jours | Retrait avec Frais |
| 10 | 3 jours | Admin & Finitions |

**Total estimé : 25 jours de développement**

---

## Commandes Utiles

```bash
# Mobile - Démarrer
cd mobile
npx expo start

# Mobile - Build APK (EAS)
eas build --profile preview --platform android

# API - Démarrer en local
cd api
npm run dev

# API - Déployer sur Render (auto sur git push)
git add . && git commit -m "update" && git push origin main
```

---

## Variables d'environnement

### API (.env)
```env
DB_HOST=switchyard.proxy.rlwy.net
DB_PORT=48340
DB_NAME=kibboutz
DB_USER=root
DB_PASSWORD=xxxxx

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

PORT=3001
```

### Mobile (.env ou app.config.js)
```env
API_URL=https://kibboutz-v2.onrender.com
```

---

## Structure du Projet

```
PPC/
├── mobile/                 # App React Native Expo
│   ├── src/
│   │   ├── screens/
│   │   │   ├── AuthScreen.tsx
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── RechargeScreen.tsx
│   │   │   ├── BetListScreen.tsx    # NOUVEAU
│   │   │   ├── WaitingScreen.tsx
│   │   │   ├── GameScreen.tsx
│   │   │   ├── ResultScreen.tsx
│   │   │   └── WithdrawScreen.tsx   # NOUVEAU
│   │   ├── services/
│   │   │   ├── api.ts               # Client API (axios)
│   │   │   ├── authService.ts
│   │   │   ├── walletService.ts
│   │   │   ├── betService.ts        # NOUVEAU
│   │   │   └── gameService.ts
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   └── config/
│   │       └── theme.ts
│   ├── app.json
│   └── package.json
│
└── api/                    # API Express.js
    ├── src/
    │   ├── routes/
    │   │   ├── auth.ts
    │   │   ├── wallet.ts
    │   │   ├── bets.ts
    │   │   ├── games.ts
    │   │   └── admin.ts
    │   ├── middlewares/
    │   │   └── auth.ts
    │   ├── services/
    │   │   ├── userService.ts
    │   │   ├── walletService.ts
    │   │   ├── betService.ts
    │   │   └── gameService.ts
    │   ├── config/
    │   │   └── database.ts
    │   └── index.ts
    ├── .env
    └── package.json
```
