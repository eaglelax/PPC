export const COLORS = {
  // Couleurs principales (charte P2C)
  primary: '#FF6B35',       // Orange Soleil - CTA, boutons
  primaryDark: '#E63946',   // Rouge Terre - pressed states
  secondary: '#E63946',     // Rouge Terre - VS, highlights
  success: '#00D4AA',       // Menthe Victoire - victoires, gains
  danger: '#E63946',        // Rouge Terre - defaites, erreurs
  warning: '#FFB627',       // Or Sahel - timer warning

  // Neutres (charte P2C)
  background: '#111118',    // Noir Profond
  surface: '#1A1A2E',       // Bleu Nuit
  surfaceLight: '#232340',
  text: '#FFFFFE',
  textSecondary: '#8E8EA0', // Gris charte
  border: '#2E2E4A',

  // Accents
  gold: '#FFB627',          // Or Sahel - solde, montants
  pix: '#6C3CE1',           // Violet Energie - Pix, badges gaming
  accent: '#6C3CE1',        // Violet Energie
  mint: '#00D4AA',          // Menthe Victoire

  // Degrade signature
  gradientStart: '#FFB627',
  gradientMid: '#FF6B35',
  gradientEnd: '#E63946',
};

export const GRADIENT_COLORS = ['#FFB627', '#FF6B35', '#E63946'] as const;

export const FONT_FAMILY = {
  bold: 'Sora_700Bold',
  semibold: 'Sora_600SemiBold',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
};

export const FONTS = {
  regular: 16,
  medium: 18,
  large: 24,
  xlarge: 32,
  title: 40,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const INITIAL_BALANCE = 0;
export const RECHARGE_FEE = 0;
export const CHOICE_TIMER = 30;
export const MIN_BET_AMOUNT = 1000;
export const GAME_FEE = 10;
export const MIN_RECHARGE = 1010;
