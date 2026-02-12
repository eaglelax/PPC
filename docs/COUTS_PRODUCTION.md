# P2C - Estimation des Couts de Production (1 an)

## Resume Executif

| Categorie | Cout Annuel (USD) | Cout Annuel (FCFA) |
|-----------|-------------------|-------------------|
| **Scenario GRATUIT** (< 1 000 utilisateurs) | ~$124 | ~75 000 F |
| **Scenario STARTER** (1 000 - 10 000 utilisateurs) | ~$308 | ~185 000 F |
| **Scenario GROWTH** (10 000 - 50 000 utilisateurs) | ~$800 - $1 500 | ~480 000 - 900 000 F |

*Taux de conversion : 1 USD = 600 FCFA*

---

## 1. Firebase (Backend)

### Authentication (Gratuit jusqu'a 50 000 MAU)

| Niveau | MAU (Utilisateurs Actifs/Mois) | Cout/Mois |
|--------|-------------------------------|-----------|
| Gratuit | 0 - 50 000 | $0 |
| Au-dela | > 50 000 | $0.0055/MAU |

**Pour P2C** : Avec 50 000 utilisateurs gratuits, vous etes couverts pour la premiere annee.

### Firestore (Base de donnees)

| Ressource | Quota Gratuit/Jour | Cout apres quota |
|-----------|-------------------|------------------|
| Lectures | 50 000 | $0.06 / 100 000 |
| Ecritures | 20 000 | $0.18 / 100 000 |
| Suppressions | 20 000 | $0.02 / 100 000 |
| Stockage | 1 GB total | $0.18 / GB / mois |

#### Estimation par scenario

**Scenario A : 500 utilisateurs actifs/jour**
- ~25 000 lectures/jour (50 lectures/utilisateur) = GRATUIT
- ~5 000 ecritures/jour (10 ecritures/utilisateur) = GRATUIT
- **Cout mensuel : $0**

**Scenario B : 5 000 utilisateurs actifs/jour**
- ~250 000 lectures/jour = ~$3.60/jour = **~$108/mois**
- ~50 000 ecritures/jour = ~$5.40/jour = **~$162/mois**
- **Cout mensuel : ~$270**

**Scenario C : 20 000 utilisateurs actifs/jour**
- ~1 000 000 lectures/jour = ~$18/jour = **~$540/mois**
- ~200 000 ecritures/jour = ~$32.40/jour = **~$972/mois**
- **Cout mensuel : ~$1 500**

---

## 2. Render (Hebergement API)

| Plan | RAM | CPU | Cout/Mois | Capacite estimee |
|------|-----|-----|-----------|------------------|
| **Free** | 512 MB | 0.1 | $0 | ~100 utilisateurs simultanes |
| **Starter** | 512 MB | 0.5 | **$7** | ~500 utilisateurs simultanes |
| **Standard** | 2 GB | 1.0 | **$25** | ~2 000 utilisateurs simultanes |
| **Pro** | 4 GB | 2.0 | **$85** | ~5 000 utilisateurs simultanes |

**Recommandation** : Commencer avec Starter ($7/mois), passer a Standard quand necessaire.

---

## 3. App Stores (Obligatoire)

| Plateforme | Type | Cout | Frequence |
|------------|------|------|-----------|
| **Google Play** | Frais d'inscription | **$25** | Une seule fois |
| **Apple App Store** | Programme Developpeur | **$99** | Par an |

**Total App Stores : $124/an** (premiere annee), $99/an (annees suivantes)

---

## 4. Domaine et SSL (Optionnel)

| Service | Cout/An |
|---------|---------|
| Nom de domaine (.com) | $10 - $15 |
| SSL | Gratuit (Let's Encrypt via Render) |

---

## 5. Orange Money API (Paiement)

| Element | Cout |
|---------|------|
| Integration API | Varie selon contrat |
| Commission par transaction | ~1% - 3% du montant |

**Note** : Les frais Orange Money sont generalement preleves sur chaque transaction, pas en abonnement fixe.

---

## Scenarios Detailles

### Scenario GRATUIT (Lancement)
*Ideal pour tester et lancer avec < 1 000 utilisateurs*

| Service | Cout/Mois | Cout/An |
|---------|-----------|---------|
| Firebase Auth | $0 | $0 |
| Firestore | $0 | $0 |
| Render Free | $0 | $0 |
| Google Play | - | $25 |
| Apple Developer | - | $99 |
| **TOTAL** | ~$10/mois | **~$124/an** |

**Capacite** : ~500-1 000 utilisateurs actifs

---

### Scenario STARTER (DETAILLE)
*Pour 1 000 - 10 000 utilisateurs*

#### Hypotheses de base
- **5 000 utilisateurs inscrits**
- **1 500 utilisateurs actifs/jour** (30% d'activite)
- **Mise moyenne** : 2 000F par partie
- **Parties/jour/joueur** : 3 parties en moyenne
- **Taux de retrait** : 20% des gains sont retires

#### NOUVEAU MODELE DE REVENUS
- **Frais par partie** : **10F par joueur** (20F total par partie)
- **Frais de retrait** : **2%** (Orange Money uniquement, pas de marge P2C)
- **Mise minimum** : 1 000F (+ 10F frais = 1 010F debites)

---

#### COUTS MENSUELS DETAILLES

| Service | Detail | Cout/Mois |
|---------|--------|-----------|
| **Firebase Auth** | 5 000 MAU (gratuit < 50k) | **0F** |
| **Firestore Lectures** | ~75 000/jour x 30 = 2.25M/mois | **~8 100F** |
| **Firestore Ecritures** | ~15 000/jour x 30 = 450k/mois | **~4 860F** |
| **Firestore Stockage** | ~500 MB | **0F** (< 1GB gratuit) |
| **Render Starter** | API Node.js | **4 200F** ($7) |
| **TOTAL COUTS** | | **~17 160F/mois** |

*Calcul Firestore : (2.25M - 1.5M gratuit) x 0.036F = 27 000F lectures + (450k - 600k gratuit) = 0F ecritures*
*Ajuste : ~13 500F/mois en Firestore realiste*

---

#### SIMULATION DES REVENUS

##### Volume de jeu mensuel
| Metrique | Calcul | Valeur |
|----------|--------|--------|
| Joueurs actifs/jour | 1 500 | 1 500 |
| Parties/jour | 1 500 x 3 / 2 (2 joueurs) | **2 250 parties/jour** |
| Parties/mois | 2 250 x 30 | **67 500 parties/mois** |
| Volume mise/mois | 67 500 x 2 000F x 2 | **270 000 000F** |

##### Flux financier
| Flux | Calcul | Montant/Mois |
|------|--------|--------------|
| Recharges | ~30% du volume | **81 000 000F** |
| Paris joues | | **270 000 000F** |
| Gains distribues | 50% (gagnants) | **135 000 000F** |
| Retraits demandes | 20% des gains | **27 000 000F** |

##### REVENUS P2C (10F par joueur par partie)
| Source de revenu | Calcul | Montant/Mois |
|------------------|--------|--------------|
| **Frais par partie** | 67 500 parties x 20F (2 joueurs) | **1 350 000F** |
| **Frais Orange Money (2% retraits)** | 27 000 000F x 2% | 540 000F (reverse a Orange) |
| **REVENU NET P2C** | | **1 350 000F/mois** |

> Les frais de retrait (2%) sont reverses a Orange Money. P2C ne prend rien sur les retraits.

---

#### RENTABILITE MENSUELLE

| | Montant |
|--|---------|
| **Revenus P2C (10F x 2 joueurs x parties)** | 1 350 000F |
| **Couts infrastructure** | -17 160F |
| **Marge operationnelle** | **1 332 840F/mois** |
| **Marge %** | **98.7%** |

> **Avantage du modele 10F/partie** : Revenus previsibles, pas de friction sur les retraits (seuls les frais Orange 2% s'appliquent).

---

#### PROJECTIONS ANNUELLES (Scenario STARTER - 10F/joueur/partie)

| Mois | Utilisateurs | Parties/mois | Revenus (20F/partie) | Couts | Profit Net |
|------|--------------|--------------|----------------------|-------|------------|
| M1 | 500 | 6 750 | 135 000F | 5 000F | 130 000F |
| M2 | 1 000 | 13 500 | 270 000F | 8 000F | 262 000F |
| M3 | 2 000 | 27 000 | 540 000F | 12 000F | 528 000F |
| M4 | 3 000 | 40 500 | 810 000F | 15 000F | 795 000F |
| M5 | 4 000 | 54 000 | 1 080 000F | 16 000F | 1 064 000F |
| M6 | 5 000 | 67 500 | 1 350 000F | 17 160F | 1 332 840F |
| M7-M12 | 5 000 | 67 500 x 6 | 1 350 000F x 6 | 17 160F x 6 | 7 997 040F |
| **TOTAL AN 1** | | **607 500** | **12 135 000F** | **177 280F** | **11 957 720F** |

> Calcul parties/mois : (utilisateurs x 30% actifs x 3 parties/jour x 30 jours) / 2 joueurs

---

#### STRUCTURE DES FRAIS (NOUVEAU MODELE)

| Operation | Frais | Destinataire | Exemple |
|-----------|-------|--------------|---------|
| **Lancer/Rejoindre une partie** | 10F fixe | P2C | Mise 2000F → debite 2010F |
| **Retrait** | 2% | Orange Money | Retrait 10 000F → recoit 9 800F |

#### AVANTAGES DU MODELE 10F/PARTIE

| Aspect | Avantage |
|--------|----------|
| **Previsibilite** | Revenus = nombre de parties x 20F |
| **Simplicite** | Frais fixes, faciles a comprendre |
| **Pas de friction retrait** | Utilisateurs retirent sans "perte" P2C |
| **Scalabilite** | Plus de parties = plus de revenus |

#### SCENARIOS SELON ACTIVITE

| Parties/jour | Revenus/jour | Revenus/mois | Revenus/an |
|--------------|--------------|--------------|------------|
| 500 | 10 000F | 300 000F | 3 600 000F |
| 1 000 | 20 000F | 600 000F | 7 200 000F |
| **2 250 (5k users)** | **45 000F** | **1 350 000F** | **16 200 000F** |
| 5 000 | 100 000F | 3 000 000F | 36 000 000F |
| 10 000 | 200 000F | 6 000 000F | 72 000 000F |

---

#### POINT MORT (Break-even)

Avec des couts de ~17 000F/mois et 20F par partie :
- **Parties necessaires** : 17 000F / 20F = **850 parties/mois**
- **Parties/jour** : 850 / 30 = **~29 parties/jour**
- **Joueurs actifs minimum** : ~20 joueurs/jour (si 3 parties/joueur)

**Conclusion** : Le point mort est atteint avec seulement **~20 utilisateurs actifs/jour** !

---

### Scenario GROWTH
*Pour 10 000 - 50 000 utilisateurs*

| Service | Cout/Mois | Cout/An |
|---------|-----------|---------|
| Firebase Auth | $0 | $0 |
| Firestore | ~$300 | ~$3 600 |
| Render Standard | $25 | $300 |
| Google Play | - | $25 |
| Apple Developer | - | $99 |
| **TOTAL** | ~$325/mois | **~$4 024/an** |

**Capacite** : ~20 000 - 50 000 utilisateurs actifs

---

## Optimisations Possibles

### 1. Reduire les lectures Firestore
- Utiliser le cache local Firebase
- Grouper les ecritures par batch
- Utiliser des listeners plutot que des requetes repetees

### 2. Compression des donnees
- Stocker moins de champs par document
- Archiver les anciennes parties

### 3. CDN pour assets statiques
- Utiliser Firebase Hosting pour les images (gratuit jusqu'a 10 GB)

---

## Calendrier de Paiement (Annee 1)

| Mois | Depense | Description |
|------|---------|-------------|
| Mois 1 | $124 | Google Play + Apple Developer |
| Mois 1-3 | $0 | Phase gratuite (test) |
| Mois 4-6 | $7/mois | Render Starter |
| Mois 7-12 | $25-57/mois | Scaling selon croissance |

**Budget recommande Annee 1 : $500 - $800 (~300 000 - 480 000 FCFA)**

---

## Comparatif avec Alternatives

| Solution | Avantage | Inconvenient |
|----------|----------|--------------|
| **Firebase (actuel)** | Temps reel natif, Auth integre | Cout a l'echelle |
| Supabase | Open source, PostgreSQL | Moins mature |
| AWS Amplify | Puissant | Plus complexe |
| Railway | Simple | Moins de features |

---

## Conclusion

Pour demarrer P2C en production :

1. **Budget minimum** : ~$124/an (75 000 FCFA) - gratuit sauf App Stores
2. **Budget recommande** : ~$500/an (300 000 FCFA) - pour 5 000+ utilisateurs
3. **Budget confortable** : ~$1 500/an (900 000 FCFA) - pour 20 000+ utilisateurs

Le modele pay-as-you-go de Firebase permet de commencer gratuitement et de payer uniquement quand l'application grandit.

---

## Sources

- [Firebase Pricing](https://firebase.google.com/pricing)
- [Firestore Quotas](https://firebase.google.com/docs/firestore/quotas)
- [Render Pricing](https://render.com/pricing)
- [Apple Developer Program](https://developer.apple.com/programs/)
- [Google Play Console](https://play.google.com/console/)

---

*Document genere le 10 Fevrier 2026*
