import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { onGameUpdate, makeChoice, getRandomChoice } from '../services/gameService';
import { COLORS, FONTS, SPACING, CHOICE_TIMER } from '../config/theme';
import { RootStackParamList, Choice, Game } from '../types';

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

  useEffect(() => {
    hasChosenRef.current = hasChosen;
  }, [hasChosen]);

  // Listen for game updates
  useEffect(() => {
    const unsub = onGameUpdate(gameId, (g) => {
      setGame(g);

      if (g?.status === 'draw') {
        setShowDraw(true);
        setSelectedChoice(null);
        setHasChosen(false);
        hasChosenRef.current = false;
        setTimer(CHOICE_TIMER);
      }

      if (g?.status === 'choosing' && showDraw) {
        setShowDraw(false);
      }

      if (g?.status === 'resolved') {
        navigation.replace('Result', { gameId });
      }
    });
    return unsub;
  }, [gameId, navigation, showDraw]);

  const handleChoice = useCallback(async (choice: Choice) => {
    if (hasChosenRef.current || !firebaseUser) return;
    hasChosenRef.current = true;
    setHasChosen(true);
    setSelectedChoice(choice);

    if (timerRef.current) clearInterval(timerRef.current);

    await makeChoice(gameId, firebaseUser.uid, choice);
  }, [firebaseUser, gameId]);

  // Timer countdown
  useEffect(() => {
    if (hasChosen || !game || game.status !== 'choosing') return;

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (!hasChosenRef.current && firebaseUser) {
            const randomChoice = getRandomChoice();
            handleChoice(randomChoice);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasChosen, game?.status, game?.round, firebaseUser, handleChoice]);

  const animatePress = (index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnims[index], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  if (!game || !firebaseUser) return null;

  const isPlayer1 = game.player1.userId === firebaseUser.uid;
  const opponent = isPlayer1 ? game.player2 : game.player1;

  const timerColor = timer <= 10 ? COLORS.danger : timer <= 20 ? COLORS.warning : COLORS.success;

  const selectedChoiceData = CHOICES.find((c) => c.key === selectedChoice);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.round}>Round {game.round || 1}</Text>
        <Text style={styles.vs}>VS {opponent.displayName}</Text>
        <Text style={styles.betInfo}>Mise : {game.betAmount.toLocaleString()}F</Text>
      </View>

      {showDraw && (
        <View style={styles.drawBanner}>
          <Text style={styles.drawText}>Egalite ! On recommence...</Text>
        </View>
      )}

      <View style={styles.timerContainer}>
        <Text style={[styles.timerText, { color: timerColor }]}>{timer}</Text>
        <Text style={styles.timerLabel}>secondes</Text>
      </View>

      {hasChosen ? (
        <View style={styles.waitingContainer}>
          {selectedChoiceData && (
            <MaterialCommunityIcons
              name={selectedChoiceData.icon}
              size={100}
              color={COLORS.primary}
              style={{ marginBottom: SPACING.lg }}
            />
          )}
          <Text style={styles.waitingText}>
            En attente de {opponent.displayName}...
          </Text>
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
                  style={styles.choiceButton}
                  onPress={() => {
                    animatePress(index);
                    handleChoice(c.key);
                  }}
                >
                  <MaterialCommunityIcons
                    name={c.icon}
                    size={48}
                    color={COLORS.text}
                    style={{ marginBottom: SPACING.sm }}
                  />
                  <Text style={styles.choiceLabel}>{c.label}</Text>
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
  },
  vs: {
    fontSize: FONTS.xlarge,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  betInfo: {
    fontSize: FONTS.regular,
    color: COLORS.gold,
    fontWeight: 'bold',
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
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  timerLabel: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
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
  },
  choicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  choiceButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
    width: 100,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  choiceLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontSize: FONTS.medium,
    color: COLORS.textSecondary,
  },
});
