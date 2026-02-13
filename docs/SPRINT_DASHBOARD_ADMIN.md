# SPRINT : Dashboard Admin P2C - Roles & Permissions

## Objectif
Transformer le dashboard web en plateforme d'administration complete avec :
1. Authentification et systeme de roles (Super Admin, Admin, Responsable Pays, Comptable)
2. KPIs avances (joueurs actifs, classements, CA par pays, CA net)
3. Gestion des utilisateurs, parties, retraits et parametres

## Duree estimee : 5 jours

---

## ROLES & PERMISSIONS

| Role | Code | Description |
|------|------|-------------|
| Super Admin | `super_admin` | Acces total, gere les admins |
| Admin | `admin` | Voit tout, gere joueurs et parties |
| Responsable Pays | `country_manager` | Voit et gere uniquement son pays (BF ou CI) |
| Comptable | `accountant` | Voit les finances (brut + net), pas les joueurs |

### Matrice des permissions

| Permission | super_admin | admin | country_manager | accountant |
|---|:---:|:---:|:---:|:---:|
| Dashboard global | oui | oui | son pays | oui |
| Liste utilisateurs | oui | oui | son pays | non |
| Bloquer utilisateur | oui | oui | non | non |
| Modifier solde | oui | non | non | non |
| Liste parties | oui | oui | son pays | non |
| Annuler partie | oui | oui | non | non |
| Transactions | oui | oui | son pays | oui |
| CA brut | oui | oui | son pays | oui |
| CA net (apres frais GeniusPay) | oui | non | non | oui |
| Classements | oui | oui | son pays | non |
| Retraits (voir/valider) | oui | oui | non | oui |
| Parametres (frais, config) | oui | non | non | non |
| Gerer les admins | oui | non | non | non |

---

## SCHEMA FIRESTORE

### Nouvelle collection `admins`
```javascript
// Collection: admins
// Document ID: Firebase Auth UID
{
  email: "admin@p2c.com",
  displayName: "Joachim",
  role: "super_admin",       // super_admin | admin | country_manager | accountant
  country: "ALL",            // "ALL" | "BF" | "CI"
  active: true,
  createdAt: Timestamp,
  createdBy: "uid_super_admin"
}
```

### Modification collection `users` (ajout champ country)
```javascript
// Ajouter a chaque user :
{
  country: "BF"   // "BF" | "CI" - detecte via indicatif telephone ou choix
}
```

---

## JOUR 1 : Backend - Auth Admin & Middleware

### T1.1 - Collection `admins` + seed Super Admin
**Priorite : CRITIQUE | Effort : 20 min**

Creer un script pour initialiser le premier super admin dans Firestore.

```typescript
// api/src/scripts/seed-admin.ts
// Cree le document admins/{uid} pour le super admin
// Utilise l'email Firebase Auth existant
```

**Fichiers :**
- `api/src/scripts/seed-admin.ts`

---

### T1.2 - Middleware `verifyAdmin`
**Priorite : CRITIQUE | Effort : 45 min**

Creer un middleware qui :
1. Verifie le token Firebase (comme `verifyToken`)
2. Cherche le uid dans la collection `admins`
3. Verifie que `active: true`
4. Verifie le role minimum requis
5. Attache `req.admin = { uid, role, country }` a la requete

```typescript
// api/src/middleware/adminAuth.ts

const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  country_manager: 2,
  accountant: 1
};

function verifyAdmin(minRole: string) {
  return async (req, res, next) => {
    // 1. Extraire et verifier le token Firebase
    // 2. Chercher dans collection admins
    // 3. Verifier role >= minRole
    // 4. Attacher req.admin
  };
}

function filterByCountry(query, adminCountry, countryField = 'country') {
  // Si admin.country !== 'ALL', filtrer par pays
}
```

**Fichiers :**
- `api/src/middleware/adminAuth.ts`

---

### T1.3 - Proteger toutes les routes admin
**Priorite : CRITIQUE | Effort : 30 min**

Appliquer `verifyAdmin()` sur toutes les routes `/api/admin/*` existantes.

```typescript
// api/src/routes/admin.ts
router.get('/stats', verifyAdmin('accountant'), getStats);
router.get('/users', verifyAdmin('country_manager'), getUsers);
router.get('/games', verifyAdmin('country_manager'), getGames);
router.get('/transactions', verifyAdmin('accountant'), getTransactions);
router.get('/waiting', verifyAdmin('admin'), getWaiting);
router.put('/settings/*', verifyAdmin('super_admin'), updateSettings);
```

**Fichiers :**
- `api/src/routes/admin.ts`

---

### T1.4 - Filtrage par pays dans les services
**Priorite : HAUTE | Effort : 45 min**

Modifier les services admin pour accepter un filtre `country` optionnel.

```typescript
// Exemple dans userService
async function getAllUsers(country?: string) {
  let query = db.collection('users').orderBy('createdAt', 'desc');
  if (country && country !== 'ALL') {
    query = query.where('country', '==', country);
  }
  return query.get();
}
```

**Fichiers :**
- `api/src/services/userService.ts`
- `api/src/services/gameService.ts`
- `api/src/services/transactionService.ts`

---

## JOUR 2 : Backend - Nouveaux endpoints

### T2.1 - Endpoint classements
**Priorite : HAUTE | Effort : 30 min**

```typescript
// GET /api/admin/rankings?type=wins|pix&country=BF&limit=20
router.get('/rankings', verifyAdmin('country_manager'), async (req, res) => {
  const { type = 'wins', country, limit = 20 } = req.query;
  const orderField = type === 'pix' ? 'pix' : 'stats.wins';
  // Query users ordonne par orderField, filtre par country si besoin
});
```

**Fichiers :**
- `api/src/routes/admin.ts`

---

### T2.2 - Endpoint joueurs actifs
**Priorite : HAUTE | Effort : 30 min**

```typescript
// GET /api/admin/active-players?period=24h|7d|30d&country=BF
// Compte les joueurs ayant joue dans la periode donnee
// Basee sur la collection games (createdAt dans la periode)
```

**Fichiers :**
- `api/src/routes/admin.ts`
- `api/src/services/gameService.ts`

---

### T2.3 - Endpoint finances / CA
**Priorite : CRITIQUE | Effort : 45 min**

```typescript
// GET /api/admin/finances?country=BF&from=2025-01-01&to=2025-12-31
router.get('/finances', verifyAdmin('accountant'), async (req, res) => {
  // CA brut = somme des fees (game_fee + withdrawal_fee)
  // Recharges totales
  // Retraits totaux
  // Volume de paris
  // CA net = CA brut - commissions GeniusPay (visible si role >= accountant)
  res.json({
    gross: {
      gameFees: 0,         // Total frais de partie (10F * nb parties)
      withdrawalFees: 0,   // Total frais de retrait (2%)
      totalRevenue: 0      // gameFees + withdrawalFees
    },
    net: {                 // Seulement si super_admin ou accountant
      geniusPayFees: 0,    // Commissions GeniusPay
      orangeMoneyFees: 0,  // Commissions Orange Money
      netRevenue: 0        // totalRevenue - commissions
    },
    volume: {
      recharges: 0,
      withdrawals: 0,
      bets: 0
    },
    period: { from, to }
  });
});
```

**Fichiers :**
- `api/src/routes/admin.ts`
- `api/src/services/financeService.ts` (nouveau)

---

### T2.4 - CRUD admins (Super Admin only)
**Priorite : HAUTE | Effort : 45 min**

```typescript
// GET    /api/admin/admins          - Liste tous les admins
// POST   /api/admin/admins          - Creer un admin (email, role, country)
// PUT    /api/admin/admins/:uid     - Modifier role/country/active
// DELETE /api/admin/admins/:uid     - Desactiver un admin
// Toutes ces routes : verifyAdmin('super_admin')
```

Lors de la creation d'un admin :
1. Creer le compte Firebase Auth (email + mot de passe temporaire)
2. Creer le document dans `admins` collection
3. Envoyer email de reset password

**Fichiers :**
- `api/src/routes/adminManagement.ts` (nouveau)

---

### T2.5 - Endpoint gestion retraits
**Priorite : MOYENNE | Effort : 30 min**

```typescript
// GET  /api/admin/withdrawals?status=pending&country=BF
// PUT  /api/admin/withdrawals/:id/approve   - Valider un retrait
// PUT  /api/admin/withdrawals/:id/reject    - Rejeter un retrait
```

**Fichiers :**
- `api/src/routes/admin.ts`

---

## JOUR 3 : Frontend - Auth & Layout

### T3.1 - Page Login
**Priorite : CRITIQUE | Effort : 45 min**

Page de connexion email/mot de passe avec Firebase Auth.
- Formulaire email + mot de passe
- Apres login, verifier que l'utilisateur est dans la collection `admins`
- Si non admin -> message d'erreur et deconnexion
- Si admin -> rediriger vers dashboard
- Stocker le token et le role dans un contexte React

**Fichiers :**
- `web/src/pages/Login.tsx` (nouveau)
- `web/src/contexts/AuthContext.tsx` (nouveau)
- `web/src/config/firebase.ts` (nouveau)

---

### T3.2 - AuthContext & ProtectedRoute
**Priorite : CRITIQUE | Effort : 30 min**

```typescript
// AuthContext fournit :
// - user (Firebase user)
// - admin (role, country depuis collection admins)
// - loading
// - login(email, password)
// - logout()

// ProtectedRoute verifie :
// - L'utilisateur est connecte
// - Son role a acces a cette page
// Sinon redirection vers /login
```

**Fichiers :**
- `web/src/contexts/AuthContext.tsx`
- `web/src/components/ProtectedRoute.tsx` (nouveau)

---

### T3.3 - Mise a jour API service (envoyer token)
**Priorite : CRITIQUE | Effort : 20 min**

Modifier `api.ts` pour inclure le token Firebase dans chaque requete.

```typescript
async function fetchWithAuth(url: string) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
```

**Fichiers :**
- `web/src/services/api.ts`

---

### T3.4 - Nouveau layout avec sidebar dynamique
**Priorite : HAUTE | Effort : 30 min**

La sidebar affiche uniquement les pages autorisees selon le role :
- **super_admin** : tout
- **admin** : tout sauf Parametres et Gestion admins
- **country_manager** : Dashboard, Utilisateurs, Parties, Classements
- **accountant** : Dashboard, Transactions, Finances, Retraits

Ajouter le nom, role et un bouton deconnexion dans la sidebar.

**Fichiers :**
- `web/src/App.tsx`

---

## JOUR 4 : Frontend - Nouvelles pages

### T4.1 - Refonte Dashboard (KPIs avances)
**Priorite : HAUTE | Effort : 1h**

Refaire la page dashboard avec :
- **Ligne 1** : Joueurs inscrits | Joueurs actifs (24h) | Parties aujourd'hui | File d'attente
- **Ligne 2** : CA brut | CA net (si autorise) | Recharges | Retraits
- Selecteur de pays (si role = super_admin/admin/accountant)
- Selecteur de periode (aujourd'hui, 7j, 30j, personnalise)

**Fichiers :**
- `web/src/pages/Dashboard.tsx`

---

### T4.2 - Page Classements
**Priorite : HAUTE | Effort : 45 min**

Deux onglets :
- **Classement Victoires** : Top joueurs par wins (pseudo, wins, parties, taux)
- **Classement Pix** : Top joueurs par pix (pseudo, pix, wins)

Filtre par pays, nombre de resultats (10/20/50).

**Fichiers :**
- `web/src/pages/Rankings.tsx` (nouveau)

---

### T4.3 - Page Finances
**Priorite : HAUTE | Effort : 1h**

Reservee aux roles `super_admin`, `admin`, `accountant`.

- CA brut : frais de jeu + frais de retrait
- CA net : CA brut - commissions paiement (super_admin + comptable uniquement)
- Filtre par pays et par periode
- Tableau recapitulatif par mois

**Fichiers :**
- `web/src/pages/Finances.tsx` (nouveau)

---

### T4.4 - Page Gestion Retraits
**Priorite : MOYENNE | Effort : 45 min**

Liste des demandes de retrait avec :
- Statut (en attente, valide, rejete)
- Boutons approuver/rejeter
- Details : montant, frais, net, telephone, methode

**Fichiers :**
- `web/src/pages/Withdrawals.tsx` (nouveau)

---

### T4.5 - Page Gestion Admins (Super Admin)
**Priorite : MOYENNE | Effort : 45 min**

- Liste des admins existants
- Formulaire : creer un admin (email, nom, role, pays)
- Modifier role/pays d'un admin
- Activer/desactiver un admin

**Fichiers :**
- `web/src/pages/AdminManagement.tsx` (nouveau)

---

## JOUR 5 : Integration, tests, deploiement

### T5.1 - Ajout du champ `country` aux users existants
**Priorite : HAUTE | Effort : 30 min**

Script de migration pour ajouter `country` aux users existants.
Par defaut `"BF"` pour les utilisateurs actuels.
Modifier le flow d'inscription pour capturer le pays.

**Fichiers :**
- `api/src/scripts/migrate-users-country.ts` (nouveau)
- `api/src/routes/auth.ts` (modification)

---

### T5.2 - Mise a jour pages existantes (Users, Games, Transactions)
**Priorite : HAUTE | Effort : 45 min**

Ajouter a chaque page existante :
- Filtre par pays (si autorise)
- Colonne pays dans les tableaux
- Masquer selon les permissions du role

**Fichiers :**
- `web/src/pages/Users.tsx`
- `web/src/pages/Games.tsx`
- `web/src/pages/Transactions.tsx`

---

### T5.3 - Tests & corrections
**Priorite : HAUTE | Effort : 1h**

- Tester chaque role avec un compte dedie
- Verifier les filtres pays
- Verifier que les routes protegees refusent les acces non autorises
- Tester le flow complet : login -> dashboard -> navigation -> logout

---

### T5.4 - Deploiement
**Priorite : HAUTE | Effort : 30 min**

- Build du web dashboard (`npm run build`)
- L'API sert deja les fichiers statiques de `web/dist/`
- Installer `firebase` cote web (`npm install firebase`)
- Configurer les variables d'environnement Firebase cote web

---

## RECAPITULATIF DES FICHIERS

### Nouveaux fichiers
| Fichier | Description |
|---------|-------------|
| `api/src/middleware/adminAuth.ts` | Middleware auth admin + role |
| `api/src/services/financeService.ts` | Calculs CA brut/net |
| `api/src/routes/adminManagement.ts` | CRUD admins |
| `api/src/scripts/seed-admin.ts` | Initialiser le super admin |
| `api/src/scripts/migrate-users-country.ts` | Migration champ country |
| `web/src/config/firebase.ts` | Config Firebase client |
| `web/src/contexts/AuthContext.tsx` | Contexte auth + role |
| `web/src/components/ProtectedRoute.tsx` | Guard de route |
| `web/src/pages/Login.tsx` | Page connexion |
| `web/src/pages/Rankings.tsx` | Classements |
| `web/src/pages/Finances.tsx` | CA et finances |
| `web/src/pages/Withdrawals.tsx` | Gestion retraits |
| `web/src/pages/AdminManagement.tsx` | Gestion admins |

### Fichiers modifies
| Fichier | Modification |
|---------|-------------|
| `api/src/routes/admin.ts` | Ajouter middleware + nouveaux endpoints |
| `api/src/routes/auth.ts` | Capturer le pays a l'inscription |
| `api/src/services/userService.ts` | Filtre par pays |
| `api/src/services/gameService.ts` | Filtre par pays + joueurs actifs |
| `api/src/services/transactionService.ts` | Filtre par pays |
| `web/src/App.tsx` | Router + sidebar dynamique |
| `web/src/services/api.ts` | Auth token + nouveaux endpoints |
| `web/src/pages/Dashboard.tsx` | KPIs avances |
| `web/src/pages/Users.tsx` | Filtre pays + permissions |
| `web/src/pages/Games.tsx` | Filtre pays + permissions |
| `web/src/pages/Transactions.tsx` | Filtre pays + permissions |
| `web/src/styles.css` | Styles login + nouvelles pages |
| `web/package.json` | Ajout dep firebase |

---

## ORDRE D'EXECUTION

```
JOUR 1 : T1.1 -> T1.2 -> T1.3 -> T1.4
JOUR 2 : T2.1 -> T2.2 -> T2.3 -> T2.4 -> T2.5
JOUR 3 : T3.1 -> T3.2 -> T3.3 -> T3.4
JOUR 4 : T4.1 -> T4.2 -> T4.3 -> T4.4 -> T4.5
JOUR 5 : T5.1 -> T5.2 -> T5.3 -> T5.4
```
