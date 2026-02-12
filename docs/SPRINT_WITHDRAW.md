# SPRINT : Implementation du Systeme de Retrait + Frais de Partie

## Objectif
1. Implementer les frais de 10F par joueur a chaque partie lancee
2. Implementer le systeme de retrait avec frais Orange Money (2%)

## Duree estimee : 2-3 jours

---

## NOUVEAU MODELE DE REVENUS

| Operation | Frais | Destinataire |
|-----------|-------|--------------|
| Lancer une partie | 10F | P2C |
| Rejoindre une partie | 10F | P2C |
| Retrait | 2% | Orange Money |

**Mise minimum** : 1 000F (+ 10F frais = 1 010F debites au total)

---

## JOUR 1 : Backend API

### Tache 1.1 : Collection Firestore `settings`
Creer une collection pour stocker les parametres configurables.

```javascript
// Collection: settings
// Document: app
{
  gameFee: 10,                // Frais par joueur par partie (10F)
  withdrawalFee: 2,           // Frais Orange Money (2%)
  minBet: 1000,               // Mise minimum (hors frais)
  minWithdrawal: 1000,        // Montant minimum de retrait
  maxWithdrawal: 500000,      // Montant maximum de retrait
  updatedAt: timestamp
}
```

### Tache 1.2 : Route API GET /api/settings
Recuperer les parametres publics (frais de retrait).

```typescript
// api/src/routes/settings.ts
router.get('/', async (req, res) => {
  const settingsDoc = await db.collection('settings').doc('app').get();
  const settings = settingsDoc.data() || { withdrawalFee: 4, minWithdrawal: 1000 };
  res.json({
    withdrawalFee: settings.withdrawalFee,
    minWithdrawal: settings.minWithdrawal,
    maxWithdrawal: settings.maxWithdrawal
  });
});
```

### Tache 1.3 : Route API POST /api/withdraw
Creer une demande de retrait (frais Orange Money 2% uniquement).

```typescript
// api/src/routes/withdraw.ts
router.post('/', authMiddleware, async (req, res) => {
  const { amount, phone, provider } = req.body; // provider: 'orange' | 'mtn' | 'moov'
  const userId = req.user.uid;

  // Validation
  if (amount < settings.minWithdrawal) {
    return res.status(400).json({ error: `Minimum ${settings.minWithdrawal}F` });
  }

  // Calcul des frais Orange Money (2%)
  const feePercent = settings.withdrawalFee; // 2%
  const feeAmount = Math.round(amount * feePercent / 100);
  const netAmount = amount - feeAmount;

  // Verifier le solde
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.data().balance < amount) {
    return res.status(400).json({ error: 'Solde insuffisant' });
  }

  // Transaction Firestore
  await db.runTransaction(async (t) => {
    // Debiter le solde
    t.update(db.collection('users').doc(userId), {
      balance: FieldValue.increment(-amount)
    });

    // Creer la demande de retrait
    const withdrawRef = db.collection('withdrawals').doc();
    t.set(withdrawRef, {
      userId,
      amount,
      feeAmount,        // Frais Orange (2%)
      netAmount,        // Montant recu par l'utilisateur
      phone,
      provider,
      status: 'pending', // pending | processing | completed | failed
      createdAt: FieldValue.serverTimestamp()
    });
  });

  // TODO: Appeler l'API Orange Money pour le transfert
  // Pour l'instant, simulation = succes immediat

  res.json({ success: true, netAmount, feeAmount });
});
```

### Tache 1.4 : Modifier la logique de creation/join de pari (frais 10F)

```typescript
// Dans api/src/routes/bets.ts - POST /api/bets (creation)
// Ajouter les frais de 10F lors de la creation

const gameFee = settings.gameFee || 10; // 10F par defaut
const totalDebit = amount + gameFee; // mise + frais

// Verifier solde suffisant pour mise + frais
if (userDoc.data().balance < totalDebit) {
  return res.status(400).json({ error: 'Solde insuffisant (mise + 10F frais)' });
}

// Debiter mise + frais
t.update(userRef, { balance: FieldValue.increment(-totalDebit) });

// Enregistrer les frais percus
t.set(db.collection('fees').doc(), {
  type: 'game_fee',
  amount: gameFee,
  betId: betRef.id,
  userId,
  createdAt: FieldValue.serverTimestamp()
});
```

```typescript
// Dans api/src/routes/bets.ts - POST /api/bets/:id/join
// Ajouter les frais de 10F lors du join

const gameFee = settings.gameFee || 10;
const totalDebit = bet.amount + gameFee;

// Verifier solde suffisant
if (userDoc.data().balance < totalDebit) {
  return res.status(400).json({ error: 'Solde insuffisant (mise + 10F frais)' });
}

// Debiter mise + frais
t.update(userRef, { balance: FieldValue.increment(-totalDebit) });

// Enregistrer les frais percus
t.set(db.collection('fees').doc(), {
  type: 'game_fee',
  amount: gameFee,
  betId,
  gameId: gameRef.id,
  userId,
  createdAt: FieldValue.serverTimestamp()
});
```

### Tache 1.4 : Collection Firestore `withdrawals`
Structure pour l'historique des retraits.

```javascript
// Collection: withdrawals
{
  id: "withdraw_xxx",
  userId: "user_xxx",
  amount: 10000,              // Montant demande
  feeAmount: 400,             // Frais (4%)
  netAmount: 9600,            // Montant recu
  phone: "77123456",
  provider: "orange",         // orange | mtn | moov
  status: "completed",        // pending | processing | completed | failed
  createdAt: timestamp,
  completedAt: timestamp
}
```

---

## JOUR 2 : Mobile App

### Tache 2.1 : Ajouter bouton "Retirer" sur HomeScreen

```typescript
// mobile/src/screens/HomeScreen.tsx
// Ajouter sous la balanceCard :

<View style={styles.actionButtons}>
  <TouchableOpacity
    style={styles.actionBtn}
    onPress={() => navigation.navigate('Withdraw')}
  >
    <Ionicons name="arrow-down-circle-outline" size={24} color={COLORS.warning} />
    <Text style={styles.actionBtnText}>Retirer</Text>
  </TouchableOpacity>
</View>
```

### Tache 2.2 : Creer WithdrawScreen

```typescript
// mobile/src/screens/WithdrawScreen.tsx
// Ecran avec :
// - Input montant
// - Affichage des frais en temps reel (4%)
// - Affichage du montant net
// - Selection du provider (Orange/MTN/Moov)
// - Input numero de telephone
// - Bouton "Retirer"
```

**Flux utilisateur :**
1. Entrer le montant
2. Voir les frais (ex: 10 000F - 400F frais = 9 600F net)
3. Selectionner Orange Money / MTN / Moov
4. Entrer le numero de telephone
5. Confirmer le retrait
6. Afficher confirmation ou erreur

### Tache 2.3 : Service API withdraw

```typescript
// mobile/src/config/api.ts
export const requestWithdrawal = async (
  amount: number,
  phone: string,
  provider: 'orange' | 'mtn' | 'moov'
) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, phone, provider }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur de retrait');
  }
  return response.json();
};

export const getSettings = async () => {
  const response = await fetch(`${API_URL}/settings`);
  return response.json();
};
```

### Tache 2.4 : Ajouter route dans navigation

```typescript
// mobile/src/types/index.ts
export type RootStackParamList = {
  // ... existant
  Withdraw: undefined;
};

// mobile/src/navigation/AppNavigator.tsx
<Stack.Screen name="Withdraw" component={WithdrawScreen} />
```

---

## JOUR 3 : Tests et Finalisation

### Tache 3.1 : Tests manuels
- [ ] Tester retrait avec solde suffisant
- [ ] Tester retrait avec solde insuffisant
- [ ] Tester montant < minimum (1000F)
- [ ] Verifier calcul des frais (4%)
- [ ] Verifier debit du solde
- [ ] Verifier historique des retraits

### Tache 3.2 : Dashboard Admin (optionnel)
- Route pour voir tous les retraits en attente
- Route pour modifier les frais de retrait

---

## Fichiers a creer/modifier

### Nouveaux fichiers
```
api/src/routes/withdraw.ts
api/src/routes/settings.ts
mobile/src/screens/WithdrawScreen.tsx
```

### Fichiers a modifier
```
api/src/index.ts              # Ajouter routes withdraw et settings
mobile/src/screens/HomeScreen.tsx  # Ajouter bouton Retirer
mobile/src/config/api.ts      # Ajouter fonctions API
mobile/src/types/index.ts     # Ajouter type Withdraw
mobile/src/navigation/AppNavigator.tsx  # Ajouter route
```

---

## Commande pour Claude Code

```
Implemente le nouveau modele de revenus pour P2C :

## PARTIE 1 : Frais de 10F par partie

1. Collection Firestore "settings" doc "app" avec :
   - gameFee: 10 (frais par joueur par partie)
   - withdrawalFee: 2 (frais Orange Money en %)
   - minBet: 1000
   - minWithdrawal: 1000

2. Modifier la route POST /api/bets (creation de pari) :
   - Debiter (mise + 10F) au lieu de juste la mise
   - Enregistrer les 10F dans une collection "fees" pour tracking

3. Modifier la route POST /api/bets/:id/join :
   - Debiter (mise + 10F) au joueur qui rejoint
   - Enregistrer les 10F dans la collection "fees"

4. Mobile : Mettre a jour l'affichage pour montrer "Mise: 2000F + 10F frais = 2010F"

## PARTIE 2 : Systeme de retrait

1. API Backend (api/):
   - Creer route GET /api/settings pour recuperer les parametres
   - Creer route POST /api/withdraw avec :
     - Validation du montant (min 1000F)
     - Calcul des frais Orange Money (2%)
     - Transaction Firestore pour debiter et creer le retrait
   - Collection Firestore "withdrawals" pour historique

2. Mobile App (mobile/):
   - Ajouter bouton "Retirer" sur HomeScreen
   - Creer WithdrawScreen avec :
     - Input montant
     - Affichage frais Orange Money (2%) et montant net
     - Selection provider (Orange Money, MTN, Moov)
     - Input numero de telephone
   - Ajouter navigation vers WithdrawScreen

## RESUME DES FRAIS
- Frais par partie : 10F (pour P2C)
- Frais de retrait : 2% (pour Orange Money, pas de marge P2C)
- Mise minimum : 1000F + 10F = 1010F debites
```

---

## Definition of Done

### Frais de partie (10F)
- [ ] Lors de la creation d'un pari, l'utilisateur est debite de (mise + 10F)
- [ ] Lors du join d'un pari, l'utilisateur est debite de (mise + 10F)
- [ ] Les frais sont enregistres dans la collection "fees"
- [ ] L'interface affiche clairement "Mise + 10F frais"
- [ ] Message d'erreur si solde < mise + 10F

### Retrait
- [ ] L'utilisateur peut voir le bouton "Retirer" sur l'accueil
- [ ] L'utilisateur peut entrer un montant et voir les frais Orange (2%)
- [ ] Les frais de 2% sont correctement calcules
- [ ] Le solde est debite apres retrait
- [ ] L'historique des retraits est enregistre
- [ ] Messages d'erreur clairs (solde insuffisant, montant minimum)
