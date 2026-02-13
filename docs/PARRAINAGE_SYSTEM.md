# Systeme de Parrainage PPC

## Vue d'ensemble

Systeme de parrainage base sur les PIX pour encourager l'acquisition d'utilisateurs actifs.

---

## Recompenses

| Evenement | Parrain | Filleul |
|-----------|---------|---------|
| Inscription du filleul | - | - |
| 1ere recharge du filleul (>=1000F) | **+10 PIX** | - |
| Chaque 10 parties jouees par le filleul | **+2 PIX** | - |
| Filleul atteint 50 victoires | **+20 PIX** | - |

> Les recompenses sont en PIX uniquement pour eviter les abus (creation de faux comptes).

---

## Fonctionnement

### Code Parrain
- Chaque utilisateur recoit un code unique a l'inscription (ex: `PPC-A7X3K9`)
- Le code est affiche sur l'ecran d'accueil
- Partage via WhatsApp, SMS, copier-coller

### Inscription Filleul
- Champ optionnel "Code parrain" sur l'ecran d'inscription
- Si code valide : relation parrain-filleul creee
- Si code invalide : message d'erreur, inscription bloquee jusqu'a correction ou suppression

### Suivi des Recompenses
- Le systeme verifie automatiquement apres chaque recharge et partie
- Les PIX sont credites instantanement au parrain
- Notification push au parrain lors de chaque gain

---

## Schema Base de Donnees

### Collection: users (champs ajoutes)

```javascript
{
  // ... champs existants ...
  referralCode: "PPC-A7X3K9",    // Code unique genere
  referredBy: "uid_du_parrain",  // null si pas de parrain
  referralStats: {
    referralsCount: 5,           // Nombre de filleuls
    pixEarned: 42                // PIX gagnes via parrainage
  }
}
```

### Collection: referrals (nouvelle)

```javascript
{
  id: "auto-generated",
  referrerId: "uid_parrain",
  refereeId: "uid_filleul",
  createdAt: Timestamp,

  // Suivi des recompenses
  rewards: {
    firstRecharge: false,        // +10 PIX quand true
    gamesPlayed: 0,              // +2 PIX tous les 10
    lastGameRewardAt: 0,         // Dernier palier recompense
    fiftyWins: false             // +20 PIX quand true
  }
}
```

---

## Endpoints API

### GET /api/referral/my-code
Retourne le code parrain de l'utilisateur connecte.

**Response:**
```json
{
  "code": "PPC-A7X3K9",
  "referralsCount": 5,
  "pixEarned": 42
}
```

### GET /api/referral/stats
Retourne les statistiques detaillees de parrainage.

**Response:**
```json
{
  "referrals": [
    {
      "displayName": "Moussa K.",
      "joinedAt": "2024-01-15",
      "gamesPlayed": 45,
      "pixEarnedFromThis": 8
    }
  ],
  "totalPixEarned": 42,
  "pendingRewards": {
    "description": "2 filleuls proches de 50 victoires"
  }
}
```

### POST /api/referral/validate
Valide un code parrain avant inscription.

**Request:**
```json
{
  "code": "PPC-A7X3K9"
}
```

**Response:**
```json
{
  "valid": true,
  "referrerName": "Amadou T."
}
```

---

## Ecrans Mobile

### 1. AuthScreen (modification)
- Ajouter champ: "Code parrain (optionnel)"
- Validation en temps reel du code
- Afficher nom du parrain si valide

### 2. HomeScreen (modification)
- Nouveau bouton: "Inviter des amis"
- Affiche le code parrain
- Compteur de filleuls

### 3. ReferralScreen (nouveau)
- Liste des filleuls avec leur activite
- Total PIX gagnes
- Boutons de partage (WhatsApp, SMS, Copier)

---

## Logique de Verification

### Apres chaque recharge (rechargeService.js)

```javascript
async function checkReferralRewardOnRecharge(userId, amount) {
  if (amount < 1000) return;

  const referral = await getReferralByReferee(userId);
  if (!referral || referral.rewards.firstRecharge) return;

  // Premiere recharge >= 1000F
  await grantPixToReferrer(referral.referrerId, 10, 'first_recharge');
  await updateReferralReward(referral.id, 'firstRecharge', true);
}
```

### Apres chaque partie (gameService.js)

```javascript
async function checkReferralRewardOnGame(userId) {
  const referral = await getReferralByReferee(userId);
  if (!referral) return;

  const user = await getUser(userId);
  const gamesPlayed = user.stats.gamesPlayed;
  const lastRewarded = referral.rewards.lastGameRewardAt;

  // +2 PIX tous les 10 jeux
  const newMilestone = Math.floor(gamesPlayed / 10) * 10;
  if (newMilestone > lastRewarded) {
    const rewards = (newMilestone - lastRewarded) / 10;
    await grantPixToReferrer(referral.referrerId, rewards * 2, 'games_milestone');
    await updateReferralReward(referral.id, 'lastGameRewardAt', newMilestone);
  }

  // +20 PIX a 50 victoires (une seule fois)
  if (user.stats.wins >= 50 && !referral.rewards.fiftyWins) {
    await grantPixToReferrer(referral.referrerId, 20, 'fifty_wins');
    await updateReferralReward(referral.id, 'fiftyWins', true);
  }
}
```

---

## Generation du Code Parrain

```javascript
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans I, O, 0, 1
  let code = 'PPC-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

---

## Securite & Anti-Fraude

1. **Pas de bonus a l'inscription** - Evite les comptes fantomes
2. **Recompenses sur activite reelle** - Recharge et parties jouees
3. **Code non-modifiable** - Un filleul ne peut pas changer de parrain
4. **Limite par IP** (optionnel) - Max 3 inscriptions/jour par IP
5. **Verification telephone** - Un numero = un compte

---

## Notifications Push

| Evenement | Message au Parrain |
|-----------|-------------------|
| Nouveau filleul | "Bienvenue a [Nom]! Invitez-le a recharger pour gagner +10 PIX" |
| 1ere recharge | "Felicitations! [Nom] a recharge. +10 PIX pour vous!" |
| 10 parties | "[Nom] a joue 10 parties. +2 PIX!" |
| 50 victoires | "[Nom] est un champion! +20 PIX bonus!" |

---

## Implementation - Ordre des Taches

1. [ ] Ajouter champs `referralCode`, `referredBy`, `referralStats` au modele User
2. [ ] Creer collection `referrals` dans Firestore
3. [ ] Generer code parrain a l'inscription (migration pour users existants)
4. [ ] Endpoint POST /api/referral/validate
5. [ ] Modifier AuthScreen - champ code parrain
6. [ ] Endpoint GET /api/referral/my-code
7. [ ] Modifier HomeScreen - bouton "Inviter"
8. [ ] Creer ReferralScreen
9. [ ] Hook dans rechargeService pour bonus 1ere recharge
10. [ ] Hook dans gameService pour bonus parties/victoires
11. [ ] Notifications push
12. [ ] Migration users existants (generer codes)

---

## Metriques a Suivre

- Taux de conversion code parrain (inscriptions avec code / total)
- PIX distribues via parrainage / mois
- Retention des filleuls vs non-parraines
- Top parrains (nombre de filleuls actifs)
