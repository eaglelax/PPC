import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, AppState, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { onGameUpdate } from '../services/gameService';
import { submitChoice, submitTimeout, cancelStaleGame, API_BASE } from '../config/api';
import { auth } from '../config/firebase';
import { COLORS, FONTS, SPACING, FONT_FAMILY, GRADIENT_COLORS, CHOICE_TIMER } from '../config/theme';
import { RootStackParamList, Choice, Game } from '../types';
import { showAlert } from '../utils/alert';
import CircularTimer from '../components/CircularTimer';

function safeHaptic(type: 'impact' | 'notification', style?: any) {
  try {
    if (type === 'impact') {
      Haptics.impactAsync(style || Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.notificationAsync(style || Haptics.NotificationFeedbackType.Warning);
    }
  } catch {}
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
  route: RouteProp<RootStackParamList, 'Game'>;
};

const CHOICES: { key: Choice; icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }[] = [
  { key: 'pierre', icon: 'hand-back-left', label: 'Pierre' },
  { key: 'papier', icon: 'hand-back-right', label: 'Papier' },
  { key: 'ciseaux', icon: 'content-cut', label: 'Ciseaux' },
];

export default function GameScreen({ navigation, route }: Props) {
  const { gameId } = route.params;
  const { firebaseUser } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [timer, setTimer] = useState(CHOICE_TIMER);
  const [hasChosen, setHasChosen] = useState(false);
  const [showDraw, setShowDraw] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [screenError, setScreenError] = useState<string | null>(null);
  const addLog = (msg: string) => setDebugLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasChosenRef = useRef(false);
  const timeoutFailCountRef = useRef(0);
  const isOfflineRef = useRef(false);
  const showDrawRef = useRef(false);
  const scaleAnims = useRef(CHOICES.map(() => new Animated.Value(1))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const roundAnim = useRef(new Animated.Value(0)).current;
  const vsSlideAnim = useRef(new Animated.Value(-50)).current;
  const vsOpacityAnim = useRef(new Animated.Value(0)).current;
  const drawSlideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    hasChosenRef.current = hasChosen;
  }, [hasChosen]);

  useEffect(() => {
    showDrawRef.current = showDraw;
  }, [showDraw]);

  // VS entry animation (on first load)
  useEffect(() => {
    if (game) {
      Animated.parallel([
        Animated.spring(vsSlideAnim, {
          toValue: 0,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(vsOpacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [!!game, vsSlideAnim, vsOpacityAnim]);

  // Round entry animation
  useEffect(() => {
    if (game?.round) {
      roundAnim.setValue(0);
      Animated.spring(roundAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [game?.round, roundAnim]);

  // Auto-cancel when app goes to background during game
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && game?.status === 'choosing') {
        submitTimeout(gameId).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [gameId, game?.status]);

  // Web: cache auth token for synchronous access during beforeunload
  const cachedTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const refreshToken = () => {
      const user = auth.currentUser;
      if (user) {
        user.getIdToken().then((t) => { cachedTokenRef.current = t; }).catch(() => {});
      }
    };
    refreshToken();
    // Refresh token every 10 minutes (tokens last 1h)
    const interval = setInterval(refreshToken, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Web: detect page reload/close and cancel active games immediately
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleBeforeUnload = () => {
      const token = cachedTokenRef.current;
      if (!token) return;
      // Call cancel-active to cancel all games and refund both players
      const url = `${API_BASE}/games/cancel-active`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Log mount
  useEffect(() => {
    addLog(`GameScreen mounted. gameId=${gameId}, user=${firebaseUser?.uid || 'null'}`);
    return () => addLog('GameScreen unmounting');
  }, []);

  // Listen for game updates
  useEffect(() => {
    addLog('Starting Firestore listener...');
    const unsub = onGameUpdate(gameId, (g) => {
      try {
        addLog(`Game update: status=${g?.status}, p1=${g?.player1?.userId?.slice(0,6)}, p2=${g?.player2?.userId?.slice(0,6)}`);
        setGame(g);
      } catch (e: any) {
        addLog(`ERROR in game callback: ${e.message}`);
        setScreenError(`Game callback: ${e.message}`);
        return;
      }

      if (g?.status === 'draw') {
        setShowDraw(true);
        showDrawRef.current = true;
        drawSlideAnim.setValue(-100);
        Animated.spring(drawSlideAnim, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }).start();
      }

      if (g?.status === 'choosing' && showDrawRef.current) {
        setShowDraw(false);
        showDrawRef.current = false;
        setSelectedChoice(null);
        setHasChosen(false);
        hasChosenRef.current = false;
        timeoutFailCountRef.current = 0;
        setTimer(CHOICE_TIMER);
      }

      if (g?.status === 'resolved') {
        addLog('Game resolved -> navigating to Result');
        navigation.replace('Result', { gameId });
      }

      if (g?.status === 'cancelled') {
        addLog('Game cancelled -> showing alert');
        showAlert(
          'Partie annulee',
          'La partie a ete annulee. Votre remboursement sera effectue dans moins de 24h.',
          [{ text: 'OK', onPress: () => navigation.replace('Home') }]
        );
      }
    }, (error) => {
      // Firestore connection lost
      addLog(`LISTENER ERROR: ${error.message}`);
      console.error('Game listener error:', error);
      setScreenError(`Firestore: ${error.message}`);
      setIsOffline(true);
      isOfflineRef.current = true;
      showAlert(
        'Connexion perdue',
        `Erreur: ${error.message}`,
        [{ text: 'OK', onPress: () => navigation.replace('Home') }]
      );
    });
    return unsub;
  }, [gameId, navigation, drawSlideAnim]);

  // Detect stale game (choosing for > 2 minutes)
  useEffect(() => {
    if (!game || game.status !== 'choosing' || !game.choosingStartedAt) return;

    const choosingTime = (game.choosingStartedAt as any)?.toDate?.()
      || new Date(game.choosingStartedAt);
    const elapsed = Date.now() - choosingTime.getTime();

    if (elapsed >= 2 * 60 * 1000) {
      cancelStaleGame(gameId).catch(() => {});
    }
  }, [game?.status, game?.choosingStartedAt, gameId]);

  const handleChoice = useCallback(async (choice: Choice) => {
    if (hasChosenRef.current || !firebaseUser) return;
    hasChosenRef.current = true;
    setHasChosen(true);
    setSelectedChoice(choice);

    safeHaptic('impact', Haptics.ImpactFeedbackStyle.Medium);

    // Glow animation
    glowAnim.setValue(0);
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await submitChoice(gameId, choice);
    } catch {
      hasChosenRef.current = false;
      setHasChosen(false);
      setSelectedChoice(null);
    }
  }, [firebaseUser, gameId, glowAnim]);

  // Timer countdown
  useEffect(() => {
    if (hasChosen || !game || game.status !== 'choosing') return;

    timerRef.current = setInterval(() => {
      setTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasChosen, game?.status, game?.round]);

  // Handle timeout when timer reaches 0
  useEffect(() => {
    if (timer !== 0 || hasChosenRef.current || !firebaseUser || !game || game.status !== 'choosing') return;

    // If offline or too many failed retries, don't keep trying
    if (isOfflineRef.current || timeoutFailCountRef.current >= 2) {
      hasChosenRef.current = true;
      setHasChosen(true);
      if (timerRef.current) clearInterval(timerRef.current);
      // Try stale game cancel when back online (handled by NetInfo listener)
      return;
    }

    hasChosenRef.current = true;
    setHasChosen(true);
    if (timerRef.current) clearInterval(timerRef.current);

    safeHaptic('notification', Haptics.NotificationFeedbackType.Warning);

    submitTimeout(gameId).catch(() => {
      timeoutFailCountRef.current += 1;
      // Only allow retry if this is the first failure and we're online
      if (timeoutFailCountRef.current < 2 && !isOfflineRef.current) {
        hasChosenRef.current = false;
        setHasChosen(false);
      }
    });
  }, [timer, firebaseUser, gameId, game?.status]);

  const animatePress = (index: number) => {
    safeHaptic('impact', Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnims[index], { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
    ]).start();
  };

  if (screenError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#e74c3c', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>ERREUR GAMESCREEN</Text>
        <Text style={{ color: '#fff', fontSize: 14, marginBottom: 12 }}>{screenError}</Text>
        <ScrollView style={{ maxHeight: 200, width: '100%', padding: 10, backgroundColor: '#1a1a2e', borderRadius: 8 }}>
          {debugLog.map((l, i) => <Text key={i} style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>{l}</Text>)}
        </ScrollView>
        <TouchableOpacity onPress={() => navigation.replace('Home')} style={{ marginTop: 20, backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retour accueil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!game || !firebaseUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement de la partie...</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 8 }}>gameId: {gameId}</Text>
        <ScrollView style={{ maxHeight: 150, width: '100%', padding: 10, marginTop: 12, backgroundColor: '#1a1a2e', borderRadius: 8 }}>
          {debugLog.map((l, i) => <Text key={i} style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>{l}</Text>)}
        </ScrollView>
      </View>
    );
  }

  let isPlayer1 = false;
  let opponent = game.player2;
  try {
    isPlayer1 = game.player1?.userId === firebaseUser.uid;
    opponent = isPlayer1 ? game.player2 : game.player1;
    if (!opponent) {
      setScreenError(`opponent is null. player1=${JSON.stringify(game.player1)}, player2=${JSON.stringify(game.player2)}`);
      return null;
    }
  } catch (e: any) {
    setScreenError(`Player check: ${e.message}. game=${JSON.stringify(game).slice(0, 200)}`);
    return null;
  }

  const selectedChoiceData = CHOICES.find((c) => c.key === selectedChoice);

  const glowShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={{
          transform: [{ scale: roundAnim }],
          opacity: roundAnim,
        }}>
          <Text style={styles.round}>Round {game.round || 1}</Text>
        </Animated.View>
        <Animated.Text style={[styles.vs, {
          opacity: vsOpacityAnim,
          transform: [{ translateY: vsSlideAnim }, { scale: vsOpacityAnim }],
        }]}>VS {opponent.displayName}</Animated.Text>
        <Text style={styles.betInfo}>Mise : {game.betAmount.toLocaleString()}F</Text>
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="wifi-off" size={18} color={COLORS.danger} />
          <Text style={styles.offlineText}>Connexion perdue - reconnexion en cours...</Text>
        </View>
      )}

      {showDraw && (
        <Animated.View style={[styles.drawBanner, { transform: [{ translateY: drawSlideAnim }] }]}>
          <Text style={styles.drawText}>Egalite ! On recommence...</Text>
        </Animated.View>
      )}

      <View style={styles.timerContainer}>
        <CircularTimer timer={timer} />
      </View>

      {hasChosen || game.status !== 'choosing' ? (
        <View style={styles.waitingContainer}>
          {selectedChoiceData && (
            <Animated.View style={{
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: glowShadowOpacity,
              shadowRadius: 20,
              elevation: 10,
            }}>
              <View style={styles.selectedChoiceCircle}>
                <MaterialCommunityIcons
                  name={selectedChoiceData.icon}
                  size={80}
                  color={COLORS.primary}
                />
              </View>
            </Animated.View>
          )}
          {hasChosen && game.status === 'choosing' && (
            <Text style={styles.waitingText}>
              En attente de {opponent.displayName}...
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.choicesContainer}>
          <Text style={styles.chooseLabel}>Faites votre choix !</Text>
          <View style={styles.choicesRow}>
            {CHOICES.map((c, index) => (
              <Animated.View
                key={c.key}
                style={{ transform: [{ scale: scaleAnims[index] }] }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    animatePress(index);
                    handleChoice(c.key);
                  }}
                >
                  <LinearGradient
                    colors={[...GRADIENT_COLORS]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.choiceButtonGradient}
                  >
                    <View style={styles.choiceButtonInner}>
                      <MaterialCommunityIcons
                        name={c.icon}
                        size={64}
                        color={COLORS.text}
                        style={{ marginBottom: SPACING.xs }}
                      />
                      <Text style={styles.choiceLabel}>{c.label}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  round: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontFamily: FONT_FAMILY.regular,
  },
  vs: {
    fontSize: FONTS.xlarge,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
    fontFamily: FONT_FAMILY.bold,
  },
  betInfo: {
    fontSize: FONTS.regular,
    color: COLORS.gold,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  offlineBanner: {
    backgroundColor: COLORS.danger + '20',
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  offlineText: {
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semibold,
    flex: 1,
  },
  drawBanner: {
    backgroundColor: COLORS.warning + '20',
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  drawText: {
    color: COLORS.warning,
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  choicesContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  chooseLabel: {
    fontSize: FONTS.large,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  choicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  choiceButtonGradient: {
    borderRadius: 22,
    padding: 2,
  },
  choiceButtonInner: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
    width: 106,
  },
  choiceLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.semibold,
  },
  selectedChoiceCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontSize: FONTS.medium,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.regular,
  },
});
