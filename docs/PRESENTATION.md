# P2C - Pierre Papier Ciseaux

## Presentation

**P2C** (prononce "Pi-deux-ci") est une application mobile de jeu Pierre-Papier-Ciseaux avec systeme de paris en argent reel. Les joueurs peuvent miser de l'argent, affronter d'autres joueurs en temps reel et gagner le double de leur mise.

---

## Concept

Le jeu classique Pierre-Papier-Ciseaux, mais avec de vrais enjeux :
- Misez de l'argent contre un adversaire
- Jouez en temps reel
- Le gagnant remporte la mise des deux joueurs
- Gagnez des **Pix** a chaque victoire

---

## Regles du jeu

### Victoire
```
Pierre  > Ciseaux  (La pierre ecrase les ciseaux)
Ciseaux > Papier   (Les ciseaux coupent le papier)
Papier  > Pierre   (Le papier enveloppe la pierre)
```

### Egalite
Si les deux joueurs font le meme choix, la partie recommence automatiquement jusqu'a ce qu'il y ait un gagnant.

### Timer
Chaque joueur a **30 secondes** pour faire son choix. Passe ce delai, un choix aleatoire est fait automatiquement.

---

## Fonctionnalites

### 1. Authentification
- Inscription avec email et mot de passe
- Connexion securisee
- Solde initial de **5 000F** offert a l'inscription

### 2. Portefeuille
- Consulter son solde en temps reel
- Historique des transactions
- Statistiques de jeu (parties, victoires, defaites, win rate)

### 3. Recharge
- Recharge via **Orange Money**
- Support prevu : MTN Money, Moov Money
- **0F de frais** sur les recharges
- Processus : Montant > Numero > Code OTP > Confirmation

### 4. Paris
- Creer un pari avec le montant de son choix (minimum **1 000F**)
- Voir la liste des paris disponibles (classes par montant)
- Rejoindre un pari existant
- Annuler son pari (remboursement)

### 5. Jeu
- Interface simple avec 3 boutons : Pierre, Papier, Ciseaux
- Timer de 30 secondes
- Affichage en temps reel du statut de l'adversaire
- Rounds multiples en cas d'egalite

### 6. Resultats
- Animation de revelation des choix
- Affichage du gagnant
- Mise a jour instantanee du solde
- Gain de **+1 Pix** par victoire

### 7. Retrait
- Retrait vers Orange Money / MTN / Moov
- Frais de retrait : **X%** (configurable par l'admin)
- Affichage du montant net avant confirmation

---

## Systeme de recompenses : Les Pix

### Qu'est-ce qu'un Pix ?
Les **Pix** sont des points de fidelite gagnes en jouant.

### Comment gagner des Pix ?
| Action | Pix gagnes |
|--------|------------|
| Victoire | +1 Pix |

### Utilisation des Pix
- A definir (conversion en argent, achats in-app, etc.)

---

## Regles financieres

| Operation | Frais |
|-----------|-------|
| Inscription | Gratuit + 5 000F offerts |
| Recharge | 0F |
| Mise minimum | 1 000F |
| Retrait | X% (configurable) |

### Calcul des gains
- **Gagnant** : Recoit mise x 2 (sa mise + celle de l'adversaire)
- **Perdant** : Perd sa mise (deja debitee)
- **Egalite** : Partie rejouee, mises conservees

---

## Stack technique

### Mobile
- **React Native** avec Expo
- TypeScript
- React Navigation

### Backend
- **Firebase** (Authentication, Firestore)
- API **Node.js + Express** sur Render
- Temps reel via Firestore listeners

### Paiement
- **Orange Money** (via API ou simulation)
- PayDunya (integration possible)

### Deploiement
- **EAS Build** pour les APK Android
- Render pour l'API
- Firebase pour la base de donnees

---

## Securite

- Authentification Firebase securisee
- Tokens JWT pour l'API
- Transactions Firestore pour eviter les race conditions
- Validation cote serveur des mises et gains

---

## Roadmap

### Phase 1 - MVP (Actuel)
- [x] Authentification
- [x] Recharge Orange Money
- [x] Liste des paris
- [x] Jeu en temps reel
- [x] Resultats et gains
- [ ] Correction bugs (gains gagnant, egalite)
- [ ] Systeme Pix

### Phase 2 - Ameliorations
- [ ] Retrait avec frais
- [ ] Dashboard admin
- [ ] MTN Money / Moov Money
- [ ] Notifications push

### Phase 3 - Croissance
- [ ] Classement des joueurs
- [ ] Systeme de niveaux
- [ ] Tournois
- [ ] Mode spectateur

---

## Contact

**Projet** : P2C - Pierre Papier Ciseaux
**Firebase** : ppc-game-8b35f
**API** : https://ppc-game.onrender.com

---

*Document genere le 10 Fevrier 2026*
