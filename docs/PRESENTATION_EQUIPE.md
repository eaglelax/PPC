# P2C - Presentation Equipe

## Vue d'ensemble

**P2C** (Pi-deux-ci) est une application mobile de jeu Pierre-Papier-Ciseaux avec paris en argent reel.

```
+------------------+       +------------------+       +------------------+
|     MOBILE       |  -->  |       API        |  -->  |    FIREBASE      |
|   React Native   |       |  Node + Express  |       |  Auth + Firestore|
|     (Expo)       |       |    (Render)      |       |                  |
+------------------+       +------------------+       +------------------+
                                    ^
                                    |
                           +------------------+
                           |   DASHBOARD WEB  |
                           |   React + Vite   |
                           +------------------+
```

---

## Architecture du projet

```
PPC/
├── mobile/          # App React Native (Expo SDK 54)
├── api/             # Backend Node.js + Express
└── web/             # Dashboard admin (React + Vite)
```

### Technologies

| Composant | Stack |
|-----------|-------|
| Mobile | React Native, Expo, TypeScript, React Navigation |
| API | Node.js, Express, Firebase Admin SDK |
| Dashboard | React, Vite, TypeScript |
| Base de donnees | Firebase Firestore (temps reel) |
| Auth | Firebase Authentication |
| Paiement | Orange Money |
| Hebergement | Render (API), EAS Build (APK) |

---

## Flux utilisateur

### 1. Inscription / Connexion
```
[Utilisateur] --> [Email + Mot de passe + Telephone + Pays]
                          |
                          v
              [Firebase Auth] --> [Compte cree]
                          |
                          v
              [Solde initial: 5 000F offerts]
```

### 2. Recharge
```
[Montant (min 1010F)] --> [Numero Orange Money] --> [Code OTP] --> [Solde credite]
```

### 3. Jouer une partie
```
[Creer/Rejoindre pari] --> [Matchmaking] --> [Choix (30s)] --> [Resolution] --> [Gains]
       |                                            |                 |
       v                                            v                 v
   Mise debitee                              Timer auto          Gagnant: mise x2
   + Frais 10F                               si timeout          + 1 Pix
```

### 4. Retrait
```
[Montant (min 1000F)] --> [Frais 2%] --> [Confirmation] --> [Orange Money]
```

---

## Modele economique

| Operation | Cout utilisateur | Revenu plateforme |
|-----------|------------------|-------------------|
| Inscription | Gratuit | -5 000F (bonus) |
| Recharge | 0F | 0F |
| Partie | 10F (frais fixes) | **+10F** |
| Retrait | 2% du montant | **+2%** |

### Exemple de partie
```
Joueur A mise 1000F + 10F frais = 1010F debites
Joueur B mise 1000F + 10F frais = 1010F debites

Revenu plateforme: 20F (frais)

Gagnant recoit: 2000F
Perdant recoit: 0F
```

---

## Simulation de gains plateforme

### Hypotheses
- Frais par partie : **10F** (preleve sur chaque joueur)
- Frais de retrait : **2%**
- Mise moyenne : **2 000F**

### Revenus par partie

| Source | Calcul | Montant |
|--------|--------|---------|
| Frais joueur 1 | 10F | 10F |
| Frais joueur 2 | 10F | 10F |
| **Total par partie** | | **20F** |

### Projections journalieres

| Joueurs actifs | Parties/jour | Revenus frais | Retraits (2%) | Total/jour |
|----------------|--------------|---------------|---------------|------------|
| 25 | 50 | 1 000F | ~500F | **1 500F** |
| 50 | 100 | 2 000F | ~1 000F | **3 000F** |
| 250 | 500 | 10 000F | ~5 000F | **15 000F** |
| 500 | 1 000 | 20 000F | ~10 000F | **30 000F** |

*Hypothese : 2 parties/jour par joueur actif, 50% des gains retires*

### Couts mensuels fixes (estimation initiale)

| Cout | Montant/mois |
|------|--------------|
| Serveur Render | ~10 000F |
| Firebase (Blaze) | ~5 000F |
| Autres (domaine, etc.) | ~5 000F |
| **Total couts** | **~20 000F/mois** |

---

## Packs Infrastructure (Recommandes)

### PACK 1 : STARTER (Lancement - Android only)
*Pour 0-100 joueurs*

```
+================================================================+
|                    PACK STARTER - 0$/mois                      |
+================================================================+
| Service              | Plan        | Prix/mois    | FCFA       |
+----------------------+-------------+--------------+------------+
| Expo                 | Free        | 0$           | 0F         |
| Render               | Free        | 0$           | 0F         |
| Firebase             | Spark(Free) | 0$           | 0F         |
| Apple Developer      | Non         | -            | -          |
+----------------------+-------------+--------------+------------+
| TOTAL MENSUEL        |             | 0$           | 0F         |
+================================================================+

Limites :
- Android uniquement (pas d'iOS)
- 15 builds Expo/mois
- API sleep apres 15min d'inactivite
- 50K auth users, 1GB storage, 10GB bandwidth
```

---

### PACK 2 : GROWTH (Croissance - Android + iOS)
*Pour 100-500 joueurs*

```
+================================================================+
|                   PACK GROWTH - 32$/mois                       |
+================================================================+
| Service              | Plan        | Prix/mois    | FCFA       |
+----------------------+-------------+--------------+------------+
| Expo                 | Free        | 0$           | 0F         |
| Render               | Starter     | 7$           | 4 600F     |
| Firebase             | Blaze       | ~5$          | 3 300F     |
| Apple Developer      | Oui         | 8$/mois*     | 5 400F     |
+----------------------+-------------+--------------+------------+
| TOTAL MENSUEL        |             | ~20$         | ~13 300F   |
+================================================================+

* Apple = 99$/an soit ~8$/mois (paiement annuel : 65 000F)

Avantages :
+ iOS disponible (15 builds/mois)
+ API toujours active
+ Firestore illimite
```

---

### PACK 3 : PRO (Scale - jusqu'a 2000 joueurs)
*Pour 500-2000 joueurs*

```
+================================================================+
|                     PACK PRO - 57$/mois                        |
+================================================================+
| Service              | Plan        | Prix/mois    | FCFA       |
+----------------------+-------------+--------------+------------+
| Expo                 | Free        | 0$           | 0F         |
| Render               | Standard    | 25$          | 16 400F    |
| Firebase             | Blaze       | ~15$         | 10 000F    |
| Apple Developer      | Oui         | 8$/mois*     | 5 400F     |
+----------------------+-------------+--------------+------------+
| TOTAL MENSUEL        |             | ~48$         | ~31 800F   |
+================================================================+

Avantages :
+ 2GB RAM (plus de joueurs simultanes)
+ Firebase scale automatique
+ 15 builds iOS/mois suffisants
```

---

### PACK 4 : ENTERPRISE (Max - jusqu'a 5000 joueurs)
*Pour 2000-5000 joueurs*

```
+================================================================+
|                  PACK ENTERPRISE - 207$/mois                   |
+================================================================+
| Service              | Plan        | Prix/mois    | FCFA       |
+----------------------+-------------+--------------+------------+
| Expo                 | Production  | 99$          | 65 000F    |
| Render               | Pro         | 85$          | 55 700F    |
| Firebase             | Blaze       | ~15$         | 10 000F    |
| Apple Developer      | Oui         | 8$/mois*     | 5 400F     |
+----------------------+-------------+--------------+------------+
| TOTAL MENSUEL        |             | ~207$        | ~136 100F  |
+================================================================+

Avantages :
+ Builds iOS illimites
+ 4GB RAM, haute disponibilite
+ Support prioritaire
```

---

## COMPARATIF DES PACKS

```
+===========================================================+
|              QUEL PACK CHOISIR ?                          |
+===========================================================+
|                                                           |
| PACK          | Joueurs  | Cout/mois  | iOS | Recommande |
|---------------|----------|------------|-----|------------|
| STARTER       | 0-100    | 0F         | Non | Lancement  |
| GROWTH        | 100-500  | 13 300F    | Oui | <-- IDEAL  |
| PRO           | 500-2000 | 31 800F    | Oui | Croissance |
| ENTERPRISE    | 2000-5000| 136 100F   | Oui | Scale      |
|                                                           |
+===========================================================+
```

---

## PACK GROWTH - DETAIL COMPLET

### 1. INVESTISSEMENT INITIAL (One-time)

```
+================================================================+
|              COUTS DE DEMARRAGE (A payer 1 seule fois)         |
+================================================================+
|                                                                |
| Apple Developer Program (annuel)                               |
| - Obligatoire pour publier sur App Store                       |
| - Prix : 99 USD/an                          |      65 000F     |
|                                                                |
| Google Play Console (a vie)                                    |
| - Obligatoire pour publier sur Play Store                      |
| - Prix : 25 USD (one-time)                  |      16 400F     |
|                                                                |
+----------------------------------------------------------------+
| TOTAL INVESTISSEMENT INITIAL                |      81 400F     |
|                                             |    (~124 EUR)    |
|                                             |    (~124 USD)    |
+================================================================+
```

---

### 2. ABONNEMENTS MENSUELS

```
+================================================================+
|                    COUTS MENSUELS RECURRENTS                   |
+================================================================+
|                                                                |
| Render (API Backend) - Plan Starter                            |
| - API toujours active (pas de sleep)                           |
| - 512MB RAM                                                    |
| - Prix : 7 USD/mois                         |       4 600F     |
|                                                                |
| Firebase (Blaze - Pay as you go)                               |
| - Firestore reads/writes                                       |
| - Authentication                                               |
| - Storage + Bandwidth                                          |
| - Prix estime : ~5 USD/mois                 |       3 300F     |
|                                                                |
| Expo (EAS Build) - Plan Free                                   |
| - 15 builds iOS/mois inclus                                    |
| - Builds Android illimites                                     |
| - Prix : 0 USD/mois                         |           0F     |
|                                                                |
+----------------------------------------------------------------+
| TOTAL MENSUEL                               |       7 900F     |
|                                             |     (~12 EUR)    |
|                                             |     (~12 USD)    |
+================================================================+
```

---

### 3. BUDGET 3 MOIS DETAILLE

```
+================================================================+
|                    BUDGET PACK GROWTH - 3 MOIS                 |
+================================================================+

MOIS 1 (Lancement)
------------------
| Apple Developer (annuel)                    |      65 000F     |
| Google Play Console (one-time)              |      16 400F     |
| Render Starter (1 mois)                     |       4 600F     |
| Firebase Blaze (1 mois)                     |       3 300F     |
| Expo Free                                   |           0F     |
+---------------------------------------------+------------------+
| SOUS-TOTAL MOIS 1                           |      89 300F     |

MOIS 2
------
| Render Starter                              |       4 600F     |
| Firebase Blaze                              |       3 300F     |
| Expo Free                                   |           0F     |
+---------------------------------------------+------------------+
| SOUS-TOTAL MOIS 2                           |       7 900F     |

MOIS 3
------
| Render Starter                              |       4 600F     |
| Firebase Blaze                              |       3 300F     |
| Expo Free                                   |           0F     |
+---------------------------------------------+------------------+
| SOUS-TOTAL MOIS 3                           |       7 900F     |

+================================================================+
|                                                                |
| TOTAL 3 MOIS                                |     105 100F     |
|                                             |    (~160 EUR)    |
|                                             |    (~160 USD)    |
|                                                                |
+================================================================+
```

---

### 4. RECAPITULATIF

```
+================================================================+
|                    PACK GROWTH - RECAPITULATIF                 |
+================================================================+
|                                                                |
|  INVESTISSEMENT INITIAL                                        |
|  ├── Apple Developer      : 65 000F (annuel)                   |
|  └── Google Play Console  : 16 400F (one-time, a vie)          |
|                             ---------                          |
|                              81 400F                           |
|                                                                |
|  ABONNEMENT MENSUEL                                            |
|  ├── Render Starter       :  4 600F/mois                       |
|  ├── Firebase Blaze       :  3 300F/mois                       |
|  └── Expo Free            :      0F/mois                       |
|                             ---------                          |
|                               7 900F/mois                      |
|                                                                |
+================================================================+
|                                                                |
|  MOIS 1  : 81 400F + 7 900F = 89 300F                          |
|  MOIS 2  :           7 900F =  7 900F                          |
|  MOIS 3  :           7 900F =  7 900F                          |
|                              ---------                         |
|  TOTAL 3 MOIS              : 105 100F (~160 EUR)               |
|                                                                |
+================================================================+
```

---

### 5. CE QUI EST INCLUS

```
+================================================================+
|                    PACK GROWTH - INCLUS                        |
+================================================================+
|                                                                |
| APPLICATIONS                                                   |
| [x] App Android sur Google Play Store                          |
| [x] App iOS sur Apple App Store                                |
| [x] 15 builds iOS/mois (suffisant)                             |
| [x] Builds Android illimites                                   |
|                                                                |
| BACKEND                                                        |
| [x] API toujours active 24/7                                   |
| [x] 512MB RAM (100-500 joueurs)                                |
| [x] HTTPS automatique                                          |
|                                                                |
| BASE DE DONNEES                                                |
| [x] Firestore temps reel                                       |
| [x] 50 000 authentifications/mois                              |
| [x] Stockage scalable                                          |
|                                                                |
| CAPACITE                                                       |
| [x] Jusqu'a 500 joueurs actifs                                 |
|                                                                |
+================================================================+
```

---

### 6. RENTABILITE PACK GROWTH

```
+================================================================+
|              QUAND SERONS-NOUS RENTABLES ?                     |
+================================================================+

Cout mensuel (apres mois 1) : 7 900F
Revenus par partie : 20F (frais) + ~20F (retrait 2%)

Seuil de rentabilite :
7 900F / 40F par partie = ~198 parties/mois
198 parties / 30 jours = ~7 parties/jour
7 parties / 5 parties par joueur = ~2 joueurs actifs

+----------------------------------------------------------------+
|  SEUIL DE RENTABILITE : 2 JOUEURS ACTIFS (5 parties/jour)      |
+----------------------------------------------------------------+
```

| Joueurs | Parties/jour | Revenus/mois | Couts | **Benefice** |
|---------|--------------|--------------|-------|--------------|
| 2 | 10 | 12 000F | 7 900F | **+4 100F** |
| 5 | 25 | 30 000F | 7 900F | **+22 100F** |
| 10 | 50 | 60 000F | 7 900F | **+52 100F** |
| 20 | 100 | 120 000F | 7 900F | **+112 100F** |
| 35 | 175 | 210 000F | 7 900F | **+202 100F** |

---

### 7. BILAN 3 MOIS (35 joueurs, 5 parties/jour)

```
+================================================================+
|              PROJECTION 3 MOIS - PACK GROWTH                   |
+================================================================+

MOIS 1
------
Depenses  : -89 300F (investissement + abonnements)
Revenus   : +210 000F (35 joueurs x 5 parties)
-------------------------------------------------
Resultat  : +120 700F

MOIS 2
------
Depenses  : -7 900F
Revenus   : +210 000F
-------------------------------------------------
Resultat  : +202 100F

MOIS 3
------
Depenses  : -7 900F
Revenus   : +210 000F
-------------------------------------------------
Resultat  : +202 100F

+================================================================+
|                                                                |
|  BILAN 3 MOIS                                                  |
|  ─────────────────────────────────────────                     |
|  Total depenses  :    105 100F                                 |
|  Total revenus   :    630 000F                                 |
|  ─────────────────────────────────────────                     |
|  BENEFICE NET    :   +524 900F (~801 EUR)                      |
|                                                                |
+================================================================+
```

---

## EVOLUTION RECOMMANDEE

```
Phase 1 : STARTER (Mois 1-2)
├── Cout : 0F/mois
├── Test avec beta users Android
└── Valider le produit

Phase 2 : GROWTH (Mois 3-6)
├── Cout : 13 300F/mois + 65 000F Apple
├── Lancer sur iOS
└── Atteindre 100+ joueurs

Phase 3 : PRO (Mois 7-12)
├── Cout : 31 800F/mois
├── Scale jusqu'a 2000 joueurs
└── Optimiser revenus

Phase 4 : ENTERPRISE (Annee 2+)
├── Cout : 136 100F/mois
└── 5000+ joueurs
```

### Projections mensuelles (30 jours)

| Joueurs | Parties/jour | Revenus/mois | Couts | **Benefice net** | EUR |
|---------|--------------|--------------|-------|------------------|-----|
| 18 | 35 | 21 000F | 20 000F | **1 000F** | ~2 EUR |
| 25 | 50 | 45 000F | 20 000F | **25 000F** | ~38 EUR |
| 50 | 100 | 90 000F | 20 000F | **70 000F** | ~107 EUR |
| 250 | 500 | 450 000F | 20 000F | **430 000F** | ~656 EUR |
| 500 | 1 000 | 900 000F | 20 000F | **880 000F** | ~1 343 EUR |
| 2 500 | 5 000 | 4 500 000F | 25 000F | **4 475 000F** | ~6 832 EUR |

**Seuil de rentabilite** : ~18 joueurs actifs (~35 parties/jour)

### Scenario de croissance - Benefices

```
                       Joueurs   Parties/jour    Revenus      Couts     BENEFICE
                       -------   ------------    --------    -------    ---------
Mois 1 (lancement)        25          50          45 000F    20 000F     25 000F
Mois 3 (croissance)      100         200         180 000F    20 000F    160 000F
Mois 6 (etabli)          250         500         450 000F    20 000F    430 000F
Mois 12 (mature)         500       1 000         900 000F    20 000F    880 000F
                                                                       ----------
Benefice annee 1 (estime)                                             4 500 000F
                                                                      (~6 870 EUR)
```

---

## Objectif : 35 joueurs actifs/jour (5 parties/joueur)

### Hypotheses de base
- **35 joueurs actifs** par jour
- **5 parties/jour** par joueur
- **Mise moyenne** : 2 000F
- **50%** des gains sont retires

### Calcul detaille

```
PARTIES JOUEES
--------------
35 joueurs x 5 parties = 175 parties/jour
(Chaque partie = 2 joueurs, donc 175 parties possibles avec rotation)

FRAIS DE JEU
------------
175 parties x 20F (10F x 2 joueurs) = 3 500F/jour

FRAIS DE RETRAIT
----------------
Gains redistribues : 175 parties x 2 000F = 350 000F/jour
Retraits estimes (50%) : 175 000F/jour
Frais 2% sur retraits : 175 000F x 2% = 3 500F/jour

TOTAL REVENUS : 3 500F + 3 500F = 7 000F/jour
```

---

### BILAN JOURNALIER

```
+=========================================+
|           REVENUS JOURNALIERS           |
+=========================================+
| Frais de jeu (175 x 20F)    |  3 500F  |
| Frais de retrait (2%)       |  3 500F  |
+-----------------------------------------+
| TOTAL REVENUS               |  7 000F  |
| Couts (20 000F / 30j)       |    667F  |
+-----------------------------------------+
| BENEFICE NET JOURNALIER     |  6 333F  |
|                             | (~10 EUR)|
+=========================================+
```

---

### BILAN HEBDOMADAIRE (7 jours)

```
+=========================================+
|          REVENUS HEBDOMADAIRES          |
+=========================================+
| Frais de jeu (7j)           | 24 500F  |
| Frais de retrait (7j)       | 24 500F  |
+-----------------------------------------+
| TOTAL REVENUS               | 49 000F  |
| Couts (20 000F / 4.3 sem)   |  4 667F  |
+-----------------------------------------+
| BENEFICE NET HEBDO          | 44 333F  |
|                             | (~68 EUR)|
+=========================================+
```

---

### BILAN MENSUEL (30 jours)

```
+=========================================+
|           REVENUS MENSUELS              |
+=========================================+
| Frais de jeu                | 105 000F |
| (175 parties x 20F x 30j)   |          |
+-----------------------------------------+
| Frais de retrait            | 105 000F |
| (175 000F x 2% x 30j)       |          |
+-----------------------------------------+
| TOTAL REVENUS               | 210 000F |
+-----------------------------------------+
| Couts mensuels              |  20 000F |
| - Serveur Render            |  10 000F |
| - Firebase                  |   5 000F |
| - Autres                    |   5 000F |
+-----------------------------------------+
| BENEFICE NET MENSUEL        | 190 000F |
|                             |(~290 EUR)|
+=========================================+
```

---

### BILAN ANNUEL (365 jours)

```
+=========================================+
|            REVENUS ANNUELS              |
+=========================================+
| Frais de jeu                |1 277 500F|
| (175 x 20F x 365j)          |          |
+-----------------------------------------+
| Frais de retrait            |1 277 500F|
| (175 000F x 2% x 365j)      |          |
+-----------------------------------------+
| TOTAL REVENUS               |2 555 000F|
+-----------------------------------------+
| Couts annuels               |  240 000F|
| (20 000F x 12 mois)         |          |
+-----------------------------------------+
| BENEFICE NET ANNUEL         |2 315 000F|
|                             |(~3 534 EUR)|
+=========================================+
```

---

### RESUME

| Periode | Parties | Revenus | Couts | **Benefice** | EUR |
|---------|---------|---------|-------|--------------|-----|
| **1 jour** | 175 | 7 000F | 667F | **6 333F** | ~10 EUR |
| **1 semaine** | 1 225 | 49 000F | 4 667F | **44 333F** | ~68 EUR |
| **1 mois** | 5 250 | 210 000F | 20 000F | **190 000F** | ~290 EUR |
| **1 an** | 63 875 | 2 555 000F | 240 000F | **2 315 000F** | ~3 534 EUR |

---

### CONCLUSION

```
+----------------------------------------------------------+
|                                                          |
|   35 JOUEURS x 5 PARTIES/JOUR                            |
|                                                          |
|   Benefice mensuel  : 190 000F  (~290 EUR)               |
|   Benefice annuel   : 2 315 000F (~3 534 EUR)            |
|                                                          |
+----------------------------------------------------------+
```

---

### Simulation joueur

#### Joueur gagnant (60% winrate)
```
10 parties a 2000F
- Mises totales    : 10 x 2000F = 20 000F
- Frais totaux     : 10 x 10F   =    100F
- Victoires (6x)   : 6 x 4000F  = 24 000F
- Defaites (4x)    : -8 000F

Resultat net : +24 000 - 20 000 - 100 = +3 900F
```

#### Joueur moyen (50% winrate)
```
10 parties a 2000F
- Mises totales    : 10 x 2000F = 20 000F
- Frais totaux     : 10 x 10F   =    100F
- Victoires (5x)   : 5 x 4000F  = 20 000F
- Defaites (5x)    : -10 000F

Resultat net : +20 000 - 20 000 - 100 = -100F (frais uniquement)
```

#### Joueur perdant (40% winrate)
```
10 parties a 2000F
- Mises totales    : 10 x 2000F = 20 000F
- Frais totaux     : 10 x 10F   =    100F
- Victoires (4x)   : 4 x 4000F  = 16 000F
- Defaites (6x)    : -12 000F

Resultat net : +16 000 - 20 000 - 100 = -4 100F
```

---

## Securite

- **Auth** : Firebase Authentication (tokens JWT)
- **API** : Verification des tokens via `firebase-admin`
- **Transactions** : Firestore transactions pour eviter les race conditions
- **Timeouts** : Protection automatique des parties bloquees
- **Validation** : Toutes les operations financieres validees cote serveur

---

## Etat actuel

### Fonctionnalites terminees
- [x] Authentification (email + telephone)
- [x] Portefeuille avec solde temps reel
- [x] Recharge Orange Money
- [x] Creation/annulation de paris
- [x] Jeu en temps reel avec timer 30s
- [x] Resolution automatique des parties
- [x] Gestion des egalites (relance auto)
- [x] Timeout automatique si joueur inactif
- [x] Systeme de Pix (+1 par victoire)
- [x] Retrait avec frais 2%
- [x] Dashboard admin (base)

### A faire
- [ ] MTN Money / Moov Money
- [ ] Notifications push
- [ ] Classement des joueurs
- [ ] Systeme de niveaux
- [ ] Tournois

---

## Environnements

| Env | URL |
|-----|-----|
| API Production | https://ppc-game.onrender.com |
| Firebase | ppc-game-8b35f |
| Dashboard local | http://localhost:5173 |
| API locale | http://localhost:3001 |

---

## Pour demarrer

### Prerequis
- Node.js 18+
- Expo CLI
- Compte Firebase

### Lancer le projet

```bash
# API
cd api && npm install && npm run dev

# Mobile
cd mobile && npm install && npx expo start

# Dashboard
cd web && npm install && npm run dev
```

---

## Contacts & Ressources

- **Projet Firebase** : ppc-game-8b35f
- **Repo** : (ajouter le lien)
- **Documentation** : /docs/

---

*Presentation mise a jour le 10 Fevrier 2026*

