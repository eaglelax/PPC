# BUSINESS PLAN - P2C (Pierre Papier Ciseaux)

## Document pour demande d'API de paiement

---

## 1. PRESENTATION DE L'ENTREPRISE

**Nom du projet** : P2C (Pi-deux-ci)
**Type d'activite** : Application mobile de divertissement
**Secteur** : Gaming / Entertainment
**Date de creation** : Fevrier 2026

---

## 2. DESCRIPTION DU PROJET

### Concept
P2C est une application mobile de jeu Pierre-Papier-Ciseaux permettant aux utilisateurs de s'affronter en temps reel avec des mises en argent.

### Fonctionnement
1. L'utilisateur s'inscrit et recharge son compte via Orange Money
2. Il cree ou rejoint une partie avec une mise de son choix
3. Les deux joueurs font leur choix (Pierre, Papier ou Ciseaux)
4. Le gagnant remporte la mise des deux joueurs
5. L'utilisateur peut retirer ses gains vers son compte Orange Money

### Public cible
- Jeunes adultes (18-35 ans)
- Utilisateurs de smartphones en Afrique de l'Ouest
- Amateurs de jeux mobiles et de divertissement

---

## 3. MODELE ECONOMIQUE

### Sources de revenus

| Source | Description | Montant |
|--------|-------------|---------|
| Frais de jeu | Preleve sur chaque partie | 10 FCFA/joueur |
| Frais de retrait | Commission sur les retraits | 2% du montant |

### Exemple de transaction

```
Partie a 2 000 FCFA :
- Joueur A paie : 2 000F (mise) + 10F (frais) = 2 010F
- Joueur B paie : 2 000F (mise) + 10F (frais) = 2 010F
- Gagnant recoit : 4 000F
- Revenus plateforme : 20F
```

---

## 4. UTILISATION DE L'API DE PAIEMENT

### Operations prevues

| Operation | Volume estime/mois | Montant moyen |
|-----------|-------------------|---------------|
| Recharges | 500-2000 | 5 000 - 20 000 FCFA |
| Retraits | 300-1500 | 5 000 - 50 000 FCFA |

### Flux financiers

```
RECHARGE (Utilisateur -> Plateforme)
------------------------------------
1. Utilisateur initie une recharge dans l'app
2. API Orange Money debite le compte utilisateur
3. Solde credite dans l'application

RETRAIT (Plateforme -> Utilisateur)
-----------------------------------
1. Utilisateur demande un retrait
2. Frais de 2% preleves
3. API Orange Money credite le compte utilisateur
```

### Securite
- Authentification Firebase securisee
- Verification d'identite par numero de telephone
- Toutes les transactions validees cote serveur
- Historique complet des transactions

---

## 5. PROJECTIONS FINANCIERES

### Annee 1 - Objectifs

| Trimestre | Utilisateurs | Transactions/mois | CA mensuel |
|-----------|--------------|-------------------|------------|
| T1 | 100 | 500 | 50 000 FCFA |
| T2 | 300 | 2 000 | 150 000 FCFA |
| T3 | 500 | 5 000 | 300 000 FCFA |
| T4 | 1 000 | 10 000 | 500 000 FCFA |

### Volume de paiements prevu

| Periode | Recharges | Retraits | Total flux |
|---------|-----------|----------|------------|
| Mois 1-3 | 2 000 000 FCFA | 1 500 000 FCFA | 3 500 000 FCFA |
| Mois 4-6 | 5 000 000 FCFA | 4 000 000 FCFA | 9 000 000 FCFA |
| Mois 7-12 | 15 000 000 FCFA | 12 000 000 FCFA | 27 000 000 FCFA |

---

## 6. EQUIPE

| Role | Responsabilite |
|------|----------------|
| Fondateur / CEO | Vision, strategie, gestion |
| Developpeur | Application mobile et backend |
| (A recruter) | Marketing et acquisition |

---

## 7. STACK TECHNIQUE

| Composant | Technologie |
|-----------|-------------|
| Application mobile | React Native (Expo) |
| Backend | Node.js + Express |
| Base de donnees | Firebase Firestore |
| Authentification | Firebase Auth |
| Paiement | Orange Money API |
| Hebergement | Render.com |

---

## 8. CONFORMITE ET LEGALITE

### Engagements
- Verification de l'age des utilisateurs (18+)
- Respect des reglementations sur les jeux d'argent
- Protection des donnees personnelles
- Transparence sur les frais et commissions
- Limitation des mises pour prevenir l'addiction

### Mesures anti-fraude
- Verification du numero de telephone
- Detection des comportements suspects
- Limite de transactions journalieres
- KYC (Know Your Customer) pour gros volumes

---

## 9. CONTACT

**Responsable du projet** : [Votre nom]
**Email** : [Votre email]
**Telephone** : [Votre numero]
**Adresse** : [Votre adresse]

---

## 10. DOCUMENTS JOINTS

- [ ] Piece d'identite (CNI/Passeport)
- [ ] Ce business plan
- [ ] Captures d'ecran de l'application (optionnel)

---

*Document genere le 11 Fevrier 2026*
*Version 1.0*
