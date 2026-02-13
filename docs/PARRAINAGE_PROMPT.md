# PROMPT: Implementation Systeme de Parrainage PPC

## Contexte

Tu travailles sur le projet PPC, un jeu mobile Pierre-Papier-Ciseaux avec paris.
- **mobile/** : React Native Expo (SDK 54)
- **api/** : Node.js + Express + Firebase Admin SDK
- **Firestore** : Base de donnees

## Objectif

Implementer un systeme de parrainage ou les utilisateurs gagnent des PIX (monnaie virtuelle non-retirable) en invitant des amis actifs.

## Regles Metier

### Recompenses (en PIX uniquement)

| Declencheur | PIX pour le Parrain |
|-------------|---------------------|
| Filleul fait sa 1ere recharge >= 1000F | +10 PIX |
| Filleul joue 10 parties | +2 PIX |
| Filleul joue 20 parties | +2 PIX |
| ... (tous les 10 jeux) | +2 PIX |
| Filleul atteint 50 victoires | +20 PIX (unique) |

### Regles

1. Pas de bonus a l'inscription - uniquement sur activite
2. Un filleul ne peut avoir qu'un seul parrain (non modifiable)
3. Le code parrain est optionnel a l'inscription
4. Chaque user a un code unique format: PPC-XXXXXX (6 caracteres alphanumeriques)

## Taches Backend (api/)

### 1. Modifier userService.js

Ajouter a la creation d'utilisateur:
```javascript
referralCode: generateReferralCode(), // PPC-A7X3K9
referredBy: null,                      // UID du parrain si code fourni
referralStats: { referralsCount: 0, pixEarned: 0 }
```

### 2. Creer referralService.js

```javascript
// Fonctions a implementer:
- generateReferralCode()           // Genere code unique
- validateReferralCode(code)       // Verifie si code existe, retourne referrer info
- createReferralLink(referrerId, refereeId)  // Cree document dans collection referrals
- checkFirstRechargeReward(userId, amount)   // Appele apres recharge
- checkGameMilestoneReward(userId)           // Appele apres partie
- grantPixToReferrer(referrerId, amount, reason)  // Credite PIX + log
- getReferralStats(userId)         // Stats pour l'ecran
```

### 3. Nouveaux Endpoints

```
POST /api/referral/validate    - Valide un code avant inscription
GET  /api/referral/my-code     - Retourne code + stats du user connecte
GET  /api/referral/stats       - Liste filleuls + details
```

### 4. Modifier authRoutes.js

A l'inscription, si `referralCode` fourni:
1. Valider le code
2. Recuperer UID du parrain
3. Sauvegarder `referredBy` sur le nouveau user
4. Creer document dans collection `referrals`
5. Incrementer `referralStats.referralsCount` du parrain

### 5. Hooks dans services existants

**rechargeService.js** - Apres recharge reussie:
```javascript
await referralService.checkFirstRechargeReward(userId, amount);
```

**gameService.js** - Apres resolution de partie:
```javascript
await referralService.checkGameMilestoneReward(loserId);
await referralService.checkGameMilestoneReward(winnerId);
```

## Taches Frontend (mobile/)

### 1. Modifier AuthScreen.tsx

Ajouter champ:
```jsx
<TextInput
  placeholder="Code parrain (optionnel)"
  value={referralCode}
  onChangeText={setReferralCode}
  autoCapitalize="characters"
  maxLength={10}
/>
{referralCode && (
  <Text style={isValidCode ? styles.valid : styles.invalid}>
    {isValidCode ? `Parraine par ${referrerName}` : 'Code invalide'}
  </Text>
)}
```

Validation en temps reel avec debounce (500ms).

### 2. Modifier HomeScreen.tsx

Ajouter bouton sous les stats:
```jsx
<TouchableOpacity onPress={() => navigation.navigate('Referral')}>
  <Icon name="people" />
  <Text>Inviter des amis</Text>
  <Text>{referralStats.referralsCount} filleuls</Text>
</TouchableOpacity>
```

### 3. Creer ReferralScreen.tsx

Ecran avec:
- Code parrain en grand (copiable)
- Boutons partage: WhatsApp, SMS, Copier
- Liste des filleuls (nom, date, parties jouees, PIX gagnes)
- Total PIX gagnes via parrainage

Message de partage:
```
Rejoins-moi sur PPC et gagne de l'argent en jouant!
Utilise mon code: PPC-XXXXXX
Telecharge: [lien app]
```

### 4. Navigation

Ajouter route dans navigation:
```javascript
<Stack.Screen name="Referral" component={ReferralScreen} />
```

## Schema Firestore

### users/{uid} (modifications)
```javascript
{
  // existants...
  referralCode: "PPC-A7X3K9",
  referredBy: "uid_parrain" | null,
  referralStats: {
    referralsCount: 0,
    pixEarned: 0
  }
}
```

### referrals/{auto-id} (nouvelle collection)
```javascript
{
  referrerId: "uid",
  refereeId: "uid",
  createdAt: Timestamp,
  rewards: {
    firstRecharge: false,
    lastGameRewardAt: 0,  // Dernier palier (0, 10, 20, 30...)
    fiftyWins: false
  }
}
```

## Tests a Effectuer

1. [ ] Inscription sans code parrain - OK
2. [ ] Inscription avec code invalide - Erreur affichee
3. [ ] Inscription avec code valide - Relation creee
4. [ ] Filleul recharge 500F - Pas de bonus
5. [ ] Filleul recharge 1000F - Parrain +10 PIX
6. [ ] Filleul recharge 2000F apres - Pas de bonus (deja fait)
7. [ ] Filleul joue 9 parties - Pas de bonus
8. [ ] Filleul joue 10eme partie - Parrain +2 PIX
9. [ ] Filleul atteint 50 wins - Parrain +20 PIX
10. [ ] Filleul atteint 100 wins - Pas de bonus supplementaire 50 wins

## Migration Users Existants

Script a executer une fois:
```javascript
const users = await db.collection('users').get();
for (const doc of users.docs) {
  if (!doc.data().referralCode) {
    await doc.ref.update({
      referralCode: generateReferralCode(),
      referredBy: null,
      referralStats: { referralsCount: 0, pixEarned: 0 }
    });
  }
}
```

## Contraintes

- Ne pas modifier le systeme de PIX existant (wins)
- Ne pas toucher au systeme de balance/recharge/withdrawal
- Utiliser les transactions Firestore pour les operations critiques
- Logger tous les gains PIX dans une collection `pix_transactions` (optionnel)
