import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { onGameUpdate } from '../services/gameService';
import { submitChoice, submitTimeout, cancelStaleGame } from '../config/api';
import { COLORS, FONTS, SPACING, FONT_FAMILY, GRADIENT_COLORS, CHOICE_TIMER } from '../config/theme';
import { RootStackParamList, Choice, Game } from '../types';
import CircularTimer from '../components/CircularTimer';

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasChosenRef = useRef(false);
  const scaleAnims = useRef(CHOICES.map(() => new Animated.Value(1))).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const roundAnim = useRef(new Animated.Value(0)).current;
  const vsSlideAnim = useRef(new Animated.Value(-50)).current;
  const vsOpacityAnim = useRef(new Animated.Value(0)).current;
  const drawSlideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    hasChosenRef.current = hasChosen;
  }, [hasChosen]);

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

  // Listen for game updates
  useEffect(() => {
    const unsub = onGameUpdate(gameId, (g) => {
      setGame(g);

      if (g?.status === 'draw') {
        setShowDraw(true);
        drawSlideAnim.setValue(-100);
        Animated.spring(drawSlideAnim, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }).start();
      }

      if (g?.status === 'choosing' && showDraw) {
        setShowDraw(false);
        setSelectedChoice(null);
        setHasChosen(false);
        hasChosenRef.current = false;
        setTimer(CHOICE_TIMER);
      }

      if (g?.status === 'resolved') {
        navigation.replace('Result', { gameId });
      }

      if (g?.status === 'cancelled') {
        Alert.alert(
          'Partie annulee',
          'La partie a ete annulee pour inactivite. Vos fonds ont ete rembourses.',
          [{ text: 'OK', onPress: () => navigation.replace('Home') }]
        );
      }
    });
    return unsub;
  }, [gameId, navigation, showDraw, drawSlideAnim]);

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

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

    hasChosenRef.current = true;
    setHasChosen(true);
    if (timerRef.current) clearInterval(timerRef.current);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    submitTimeout(gameId).catch(() => {
      hasChosenRef.current = false;
      setHasChosen(false);
    });
  }, [timer, firebaseUser, gameId, game?.status]);

  const animatePress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnims[index], { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }),
    ]).start();
  };

  if (!game || !firebaseUser) return null;

  const isPlayer1 = game.player1.userId === firebaseUser.uid;
  const opponent = isPlayer1 ? game.player2 : game.player1;

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
