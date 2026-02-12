import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { onGameUpdate } from '../services/gameService';
import { COLORS, FONTS, SPACING, FONT_FAMILY } from '../config/theme';
import { RootStackParamList, Game, Choice } from '../types';
import GradientButton from '../components/GradientButton';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
  route: RouteProp<RootStackParamList, 'Result'>;
};

const CHOICE_ICONS: Record<Choice, keyof typeof MaterialCommunityIcons.glyphMap> = {
  pierre: 'hand-back-left',
  papier: 'hand-back-right',
  ciseaux: 'content-cut',
};

// Simple confetti particle component
function Confetti({ isWinner }: { isWinner: boolean }) {
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * 300 - 150),
      y: new Animated.Value(-20),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: [COLORS.gold, COLORS.primary, COLORS.mint, COLORS.pix][i % 4],
      size: 6 + Math.random() * 6,
    }))
  ).current;

  useEffect(() => {
    if (!isWinner) return;

    particles.forEach((p) => {
      const targetX = Math.random() * 350 - 175;
      const delay = Math.random() * 400;

      Animated.parallel([
        Animated.timing(p.y, {
          toValue: 600,
          duration: 2000 + Math.random() * 1000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(p.x, {
          toValue: targetX,
          duration: 2000 + Math.random() * 1000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: 360 * (Math.random() > 0.5 ? 1 : -1),
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration: 2500,
          delay: delay + 500,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [isWinner, particles]);

  if (!isWinner) return null;

  return (
    <View style={confettiStyles.container} pointerEvents="none">
      {particles.map((p) => (
        <Animated.View
          key={p.id}
          style={[
            confettiStyles.particle,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const confettiStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});

export default function ResultScreen({ navigation, route }: Props) {
  const { gameId } = route.params;
  const { firebaseUser, userData } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [displayAmount, setDisplayAmount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const unsub = onGameUpdate(gameId, (g) => {
      setGame(g);
    });
    return unsub;
  }, [gameId]);

  // Entry animations
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim, slideAnim]);

  // Animated counter for win amount
  useEffect(() => {
    if (!game || !firebaseUser) return;
    const isWin = game.winner === firebaseUser.uid;
    const target = isWin ? game.betAmount * 2 : game.betAmount;

    if (isWin) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }

    // Counter animation
    const duration = 1000;
    const steps = 30;
    const stepTime = duration / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += target / steps;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setDisplayAmount(Math.round(current));
    }, stepTime);

    return () => clearInterval(interval);
  }, [game, firebaseUser]);

  if (!game || !firebaseUser) {
    return (
      <View style={[styles.container, { alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isPlayer1 = game.player1.userId === firebaseUser.uid;
  const myData = isPlayer1 ? game.player1 : game.player2;
  const opponentData = isPlayer1 ? game.player2 : game.player1;
  const isWinner = game.winner === firebaseUser.uid;

  return (
    <View style={styles.container}>
      <Confetti isWinner={isWinner} />

      <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons
          name={isWinner ? 'trophy' : 'sad-outline'}
          size={80}
          color={isWinner ? COLORS.gold : COLORS.danger}
          style={{ marginBottom: SPACING.md }}
        />
        <Text style={[styles.resultTitle, { color: isWinner ? COLORS.gold : COLORS.danger }]}>
          {isWinner ? 'VICTOIRE !' : 'DEFAITE'}
        </Text>
        <Text style={[styles.resultAmount, { color: isWinner ? COLORS.success : COLORS.danger }]}>
          {isWinner ? `+${displayAmount.toLocaleString()}F` : `-${displayAmount.toLocaleString()}F`}
        </Text>
        {isWinner && (
          <View style={styles.pixReward}>
            <Ionicons name="diamond" size={24} color={COLORS.pix} />
            <Text style={styles.pixRewardText}>+1 Pix</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View style={[styles.matchup, {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }]}>
        <View style={styles.playerSide}>
          <Text style={styles.playerName}>Vous</Text>
          {myData.choice ? (
            <MaterialCommunityIcons
              name={CHOICE_ICONS[myData.choice]}
              size={56}
              color={COLORS.text}
              style={{ marginBottom: SPACING.xs }}
            />
          ) : (
            <Text style={styles.playerChoicePlaceholder}>?</Text>
          )}
          <Text style={styles.choiceLabel}>
            {myData.choice || '?'}
          </Text>
        </View>

        <Text style={styles.vsText}>VS</Text>

        <View style={styles.playerSide}>
          <Text style={styles.playerName}>{opponentData.displayName}</Text>
          {opponentData.choice ? (
            <MaterialCommunityIcons
              name={CHOICE_ICONS[opponentData.choice]}
              size={56}
              color={COLORS.text}
              style={{ marginBottom: SPACING.xs }}
            />
          ) : (
            <Text style={styles.playerChoicePlaceholder}>?</Text>
          )}
          <Text style={styles.choiceLabel}>
            {opponentData.choice || '?'}
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}>
        <View style={styles.newBalance}>
          <Text style={styles.newBalanceLabel}>Nouveau solde</Text>
          <Text style={styles.newBalanceValue}>{userData?.balance.toLocaleString()}F</Text>
        </View>

        <View style={styles.actions}>
          <GradientButton
            title="Rejouer"
            onPress={() => navigation.navigate('Bet')}
          />

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.homeText}>Accueil</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  resultCard: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  resultTitle: {
    fontSize: FONTS.title,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  resultAmount: {
    fontSize: FONTS.xlarge,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
    fontFamily: FONT_FAMILY.bold,
  },
  pixReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  pixRewardText: {
    color: COLORS.pix,
    fontSize: FONTS.medium,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  matchup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  playerSide: {
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  playerChoicePlaceholder: {
    fontSize: 56,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  choiceLabel: {
    fontSize: 14,
    color: COLORS.text,
    textTransform: 'capitalize',
    fontFamily: FONT_FAMILY.regular,
  },
  vsText: {
    fontSize: FONTS.large,
    fontWeight: 'bold',
    color: COLORS.secondary,
    fontFamily: FONT_FAMILY.bold,
  },
  newBalance: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  newBalanceLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.regular,
    fontFamily: FONT_FAMILY.regular,
  },
  newBalanceValue: {
    color: COLORS.gold,
    fontSize: FONTS.large,
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
  },
  actions: {
    gap: SPACING.md,
  },
  homeButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.medium,
    fontFamily: FONT_FAMILY.medium,
  },
});
