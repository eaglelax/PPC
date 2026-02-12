# SPRINT UI REBRAND P2C

## Objectif
Aligner l'interface mobile sur la charte graphique P2C/LEXOVA et rendre le jeu plus interactif.

## Duree estimee : 3 jours

---

## JOUR 1 : Fondations visuelles

### T1 - Palette couleurs (theme.ts)
**Priorite : CRITIQUE | Effort : 15 min**

Remplacer toute la palette dans `mobile/src/config/theme.ts` :
```
primary: '#FF6B35'       // Orange Soleil (CTA, boutons, navbar active)
primaryDark: '#E63946'   // Rouge Terre (hover, pressed states)
secondary: '#E63946'     // Rouge Terre (VS, highlights)
success: '#00D4AA'       // Menthe Victoire (victoires, gains)
danger: '#E63946'        // Rouge Terre (defaites, erreurs)
warning: '#FFB627'       // Or Sahel (timer warning)
background: '#111118'    // Noir Profond
surface: '#1A1A2E'       // Bleu Nuit
surfaceLight: '#232340'  // (inchange)
text: '#FFFFFE'          // (inchange)
textSecondary: '#8E8EA0' // Gris charte
border: '#2E2E4A'        // (inchange)
gold: '#FFB627'          // Or Sahel (solde, montants)
pix: '#6C3CE1'           // Violet Energie (Pix, badges gaming)
accent: '#6C3CE1'        // Violet Energie (accents gaming)
mint: '#00D4AA'          // Menthe Victoire (victoires)
```
**Fichier :** `mobile/src/config/theme.ts`

---

### T2 - Fonts custom (Sora + Outfit)
**Priorite : HAUTE | Effort : 30 min**

- Installer `expo-font` et `@expo-google-fonts/sora` + `@expo-google-fonts/outfit`
- Creer un hook `useFonts` dans App.tsx avec splash screen pendant le chargement
- Mettre a jour `theme.ts` avec les noms de fonts :
  ```
  fontBold: 'Sora_700Bold'
  fontRegular: 'Outfit_400Regular'
  fontMedium: 'Outfit_500Medium'
  ```
- Appliquer sur tous les ecrans : titres en Sora Bold, texte en Outfit Regular

**Fichiers :** `mobile/App.tsx`, `mobile/src/config/theme.ts`

---

### T3 - Logo P2C sur AuthScreen
**Priorite : CRITIQUE | Effort : 30 min**

- Copier `P2C_Icon_Only.png` dans `mobile/assets/`
- Remplacer les 3 icones (pierre/papier/ciseaux) par l'image du bouclier P2C
- Titre : "P2C" au lieu de "PPC Game"
  - Le "2" en couleur Or Sahel (#FFB627) pour simuler le degrade
  - Ou utiliser `expo-linear-gradient` pour le vrai degrade sur le "2"
- Sous-titre : "Pierre - Papier - Ciseaux" (inchange)
- Ajouter en bas : "POWERED BY LEXOVA" en gris (#8E8EA0), 10pt

**Fichier :** `mobile/src/screens/AuthScreen.tsx`

---

### T4 - Logo P2C sur HomeScreen
**Priorite : HAUTE | Effort : 20 min**

- Ajouter le logo P2C (icon small) a cote du profil dans le header
- Balance card : bordure en Orange Soleil au lieu de violet
- Avatar : backgroundColor en Orange Soleil au lieu de violet

**Fichier :** `mobile/src/screens/HomeScreen.tsx`

---

### T5 - Navbar rebrand
**Priorite : HAUTE | Effort : 10 min**

- Icone/label active : couleur Orange Soleil (#FF6B35) au lieu de violet
- Optionnel : petit point Orange sous l'onglet actif

**Fichier :** `mobile/src/components/Navbar.tsx`

---

### T6 - Boutons CTA en degrade
**Priorite : HAUTE | Effort : 45 min**

- Installer `expo-linear-gradient`
- Creer un composant `GradientButton` reutilisable :
  ```
  Degrade : #FFB627 -> #FF6B35 -> #E63946 (direction 135deg)
  Border radius : 12
  Texte : blanc, Sora Bold
  ```
- Remplacer les boutons principaux :
  - AuthScreen : "Se connecter" / "S'inscrire"
  - BetScreen : FAB + "Creer le pari"
  - ResultScreen : "Rejouer"
  - GameScreen : boutons de choix (bordure en degrade)

**Fichiers :** nouveau `mobile/src/components/GradientButton.tsx`, puis tous les ecrans

---

## JOUR 2 : Ecrans de jeu

### T7 - Timer circulaire (GameScreen)
**Priorite : HAUTE | Effort : 1h**

- Installer `react-native-svg` (deja dispo avec Expo)
- Creer un composant `CircularTimer` :
  - Anneau SVG qui se vide progressivement
  - Degrade Or Sahel -> Orange Soleil -> Rouge Terre selon le temps restant
  - Chiffre au centre en Sora Bold
  - Pulse animation quand < 10s
- Remplacer le gros chiffre actuel par ce composant

**Fichiers :** nouveau `mobile/src/components/CircularTimer.tsx`, `mobile/src/screens/GameScreen.tsx`

---

### T8 - Boutons de choix (GameScreen)
**Priorite : HAUTE | Effort : 45 min**

- Bordure des boutons en degrade (Or -> Orange)
- Animation scale + spring au press (deja partiellement la)
- Glow orange autour du choix selectionne (shadow + border)
- Icones plus grandes (64 au lieu de 48)
- Ajouter haptic feedback (`expo-haptics`) au press

**Fichier :** `mobile/src/screens/GameScreen.tsx`

---

### T9 - Ecran Resultat ameliore
**Priorite : HAUTE | Effort : 1h**

- **Victoire** :
  - Trophee en Or Sahel (#FFB627) au lieu de vert
  - Montant gagne en Or Sahel, anime (counter de 0 au montant)
  - Texte "VICTOIRE" en degrade Or -> Orange
  - Animation de confettis simples (petits cercles colores qui tombent)
- **Defaite** :
  - Couleur Rouge Terre (#E63946)
  - Animation sobre (fade in + scale)
- Bouton "Rejouer" en degrade signature
- Bouton "Accueil" en surface avec bordure

**Fichier :** `mobile/src/screens/ResultScreen.tsx`

---

### T10 - Ecran Waiting ameliore
**Priorite : MOYENNE | Effort : 30 min**

- Remplacer l'icone loupe par l'image du bouclier P2C avec animation pulse
- Texte "Recherche d'un adversaire" en Sora Bold
- Ajouter des petits points lumineux (3 dots animees) au lieu de "..."
- Mise affichee en Or Sahel

**Fichier :** `mobile/src/screens/WaitingScreen.tsx`

---

## JOUR 3 : Animations et polish

### T11 - Animations de transition (GameScreen)
**Priorite : MOYENNE | Effort : 1h30**

- **Entree en jeu** : "VS NomAdversaire" qui slide depuis le haut avec scale
- **Nouveau round** : "Round X" qui apparait avec un fade + scale
- **Egalite** : banniere qui slide depuis le haut au lieu d'apparaitre
- **Timer 3-2-1** : optionnel, gros chiffres animes avant chaque round

**Fichier :** `mobile/src/screens/GameScreen.tsx`

---

### T12 - Confettis / particules victoire
**Priorite : MOYENNE | Effort : 1h**

- Creer un composant `Confetti` leger en pure RN Animated :
  - 20-30 petits cercles de couleurs (Or Sahel, Orange, Menthe)
  - Animation : chute + rotation + fade out
  - Dure 2-3 secondes
- Declenche sur ResultScreen quand victoire

**Fichiers :** nouveau `mobile/src/components/Confetti.tsx`, `mobile/src/screens/ResultScreen.tsx`

---

### T13 - Splash Screen officiel
**Priorite : MOYENNE | Effort : 20 min**

- Remplacer le splash screen Expo par `P2C_Splash_Screen.png` de la charte
- Mettre a jour `app.json` :
  ```json
  "splash": {
    "image": "./assets/P2C_Splash_Screen.png",
    "resizeMode": "cover",
    "backgroundColor": "#111118"
  }
  ```
- App icon : utiliser `P2C_Icon_App.png`

**Fichiers :** `mobile/app.json`, copie des assets

---

### T14 - Icone de l'app
**Priorite : HAUTE | Effort : 10 min**

- Copier `P2C_Icon_App.png` dans `mobile/assets/`
- Mettre a jour `app.json` : `"icon": "./assets/P2C_Icon_App.png"`
- Adaptive icon Android : fond `#111118` + foreground P2C_Icon_Only

**Fichier :** `mobile/app.json`

---

### T15 - BetScreen rebrand
**Priorite : MOYENNE | Effort : 20 min**

- Titre "Paris disponibles" en Sora Bold
- Montants en Or Sahel
- Bouton "Rejoindre" en Orange Soleil au lieu de violet
- FAB en degrade signature
- Badge "Reprendre" avec bordure Orange

**Fichier :** `mobile/src/screens/BetScreen.tsx`

---

### T16 - RechargeScreen + WithdrawScreen rebrand
**Priorite : MOYENNE | Effort : 20 min**

- Boutons principaux en degrade signature
- Montants en Or Sahel
- Coherence couleurs avec le reste

**Fichiers :** `mobile/src/screens/RechargeScreen.tsx`, `mobile/src/screens/WithdrawScreen.tsx`

---

## Resume du sprint

| # | Tache | Jour | Effort | Priorite |
|---|-------|------|--------|----------|
| T1 | Palette couleurs | J1 | 15 min | CRITIQUE |
| T2 | Fonts Sora/Outfit | J1 | 30 min | HAUTE |
| T3 | Logo AuthScreen | J1 | 30 min | CRITIQUE |
| T4 | Logo HomeScreen | J1 | 20 min | HAUTE |
| T5 | Navbar rebrand | J1 | 10 min | HAUTE |
| T6 | Boutons CTA degrade | J1 | 45 min | HAUTE |
| T7 | Timer circulaire | J2 | 1h | HAUTE |
| T8 | Boutons de choix | J2 | 45 min | HAUTE |
| T9 | Ecran Resultat | J2 | 1h | HAUTE |
| T10 | Ecran Waiting | J2 | 30 min | MOYENNE |
| T11 | Animations transition | J3 | 1h30 | MOYENNE |
| T12 | Confettis victoire | J3 | 1h | MOYENNE |
| T13 | Splash Screen | J3 | 20 min | MOYENNE |
| T14 | Icone app | J3 | 10 min | HAUTE |
| T15 | BetScreen rebrand | J3 | 20 min | MOYENNE |
| T16 | Recharge/Withdraw | J3 | 20 min | MOYENNE |

**Total estime : ~9h30 sur 3 jours**

## Dependances npm a installer

```bash
npx expo install expo-linear-gradient expo-font expo-haptics
npm install @expo-google-fonts/sora @expo-google-fonts/outfit
```

## Definition of Done

- [ ] Toutes les couleurs correspondent a la charte P2C
- [ ] Logo P2C visible sur Auth + Home
- [ ] Nom "P2C" affiche partout (plus "PPC Game")
- [ ] Fonts Sora (titres) et Outfit (corps) appliquees
- [ ] Timer circulaire avec degrade sur GameScreen
- [ ] Animation de victoire/defaite sur ResultScreen
- [ ] Boutons principaux en degrade signature
- [ ] Splash screen et icone app officiels
- [ ] Build APK + test complet sur device
